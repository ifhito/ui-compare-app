import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { resolveEnv, EnvBindings } from '../../config/env';
import { createTursoClient } from '../../infrastructure/persistence/turso-client';
import { TursoComparisonRepository } from '../../infrastructure/persistence/turso-comparison-repository';
import { TursoVoteRepository } from '../../infrastructure/persistence/turso-vote-repository';
import { TursoVoteSessionRepository } from '../../infrastructure/persistence/turso-vote-session-repository';
import { TursoUserProfileRepository } from '../../infrastructure/persistence/turso-user-profile-repository';
import { UserProfile } from '../../domain/user/entities/user-profile';
import { CreateComparisonCommand } from '../../application/comparison/create-comparison';
import { ListComparisonsQuery } from '../../application/comparison/list-comparisons';
import { GetComparisonQuery } from '../../application/comparison/get-comparison';
import { GetMyComparisonsQuery } from '../../application/comparison/get-my-comparisons';
import { UpdateComparisonCommand } from '../../application/comparison/update-comparison';
import { PublishComparisonCommand } from '../../application/comparison/publish-comparison';
import { GetComparisonResultsQuery } from '../../application/voting/get-comparison-results';
import { SubmitVoteCommand, TurnstileVerifier, RateLimiter } from '../../application/voting/submit-vote';
import { CloudflareTurnstileVerifier, NoopTurnstileVerifier } from '../../infrastructure/auth/turnstile-verifier';
import { NoopRateLimiter } from '../../infrastructure/messaging/noop-rate-limiter';
import { InMemoryEventBus } from '../../application/shared/event-bus';
import { authMiddleware, AUTH_USER_KEY } from '../../middleware/auth';
import { RestFirebaseAuthVerifier, EmulatorFirebaseAuthVerifier, FirebaseAuthVerifier } from '../../infrastructure/auth/firebase-auth-verifier';
import { getAuthUser } from '../../middleware/auth';
import { verifyStackblitzSignature } from '../../infrastructure/webhooks/stackblitz-verifier';

const variantSchema = z.object({
  label: z.string().min(1),
  stackblitzUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const createComparisonSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantSchema).min(2).max(4),
});

const updateComparisonSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantSchema).min(2).max(4).optional(),
});

const publishComparisonSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
});

const voteSchema = z.object({
  comparisonId: z.string().uuid(),
  variantId: z.string().uuid(),
  turnstileToken: z.string().min(1),
  comment: z.string().max(500).nullable().optional(),
});

const stackblitzSchema = z.object({
  projectId: z.string().min(1),
});

function createFirebaseVerifier(env: EnvBindings): FirebaseAuthVerifier {
  if (env.FIREBASE_AUTH_EMULATOR) {
    return new EmulatorFirebaseAuthVerifier(env.FIREBASE_AUTH_EMULATOR);
  }
  if (env.FIREBASE_WEB_API_KEY) {
    return new RestFirebaseAuthVerifier(env.FIREBASE_WEB_API_KEY, env.FIREBASE_PROJECT_ID);
  }
  return {
    async verify(token: string) {
      if (!token.startsWith('test:')) {
        throw new Error('Only test tokens supported');
      }
      const uid = token.slice(5);
      return { uid };
    },
  };
}

function createTurnstileVerifier(env: EnvBindings): TurnstileVerifier {
  if (env.TURNSTILE_SECRET_KEY) {
    return new CloudflareTurnstileVerifier(env.TURNSTILE_SECRET_KEY);
  }
  return new NoopTurnstileVerifier();
}

export type ApiBindings = EnvBindings;

export function registerRoutes(app: Hono<{ Bindings: ApiBindings; Variables: Record<string, unknown> }>) {
  app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/v1/webhooks/stackblitz', async (c, next) => {
    const env = resolveEnv(c.env);
    const signature = c.req.header('x-stackblitz-signature');
    const payload = await c.req.text();
    const verified = await verifyStackblitzSignature({
      payload,
      signatureHeader: signature ?? '',
      secret: env.STACKBLITZ_WEBHOOK_SECRET,
    });
    if (!verified) {
      return c.json({ code: 'invalid_signature', message: 'Signature verification failed' }, 401);
    }
    c.set('stackblitzPayload', JSON.parse(payload));
    return next();
  });

  app.post('/api/v1/webhooks/stackblitz', zValidator('json', stackblitzSchema), (c) => {
    // TODO: handle project sync logic
    return c.json({ status: 'accepted' }, 202);
  });

  app.use('/api/v1/*', (c, next) => {
    const env = resolveEnv(c.env);
    const client = createTursoClient(env);
    c.set('tursoClient', client);
    c.set('eventBus', new InMemoryEventBus());
    c.set('comparisonRepository', new TursoComparisonRepository(client));
    c.set('voteRepository', new TursoVoteRepository(client));
    c.set('voteSessionRepository', new TursoVoteSessionRepository(client));
    c.set('userProfileRepository', new TursoUserProfileRepository(client));
    c.set('turnstileVerifier', createTurnstileVerifier(env));
    c.set('rateLimiter', new NoopRateLimiter());
    return next();
  });

  app.use('/api/v1/comparisons', (c, next) => {
    const env = resolveEnv(c.env);
    return authMiddleware(createFirebaseVerifier(env))(c, next);
  });
  app.use('/api/v1/votes', (c, next) => {
    const env = resolveEnv(c.env);
    return authMiddleware(createFirebaseVerifier(env))(c, next);
  });
  app.use('/api/v1/me/*', (c, next) => {
    const env = resolveEnv(c.env);
    return authMiddleware(createFirebaseVerifier(env))(c, next);
  });

  app.get('/api/v1/comparisons', async (c) => {
    const repo = c.get<TursoComparisonRepository>('comparisonRepository');
    const useCase = new ListComparisonsQuery(repo);
    const limit = Number(c.req.query('limit') ?? '20');
    const offset = Number(c.req.query('offset') ?? '0');
    const result = await useCase.execute({ limit, offset });
    return c.json({ data: result });
  });

  app.get('/api/v1/comparisons/:id', async (c) => {
    const id = c.req.param('id');
    const repo = c.get<TursoComparisonRepository>('comparisonRepository');
    const useCase = new GetComparisonQuery(repo);
    const data = await useCase.execute(id);
    return c.json({ data });
  });

  app.post('/api/v1/comparisons', zValidator('json', createComparisonSchema), async (c) => {
    const body = c.req.valid('json');
    const repo = c.get<TursoComparisonRepository>('comparisonRepository');
    const useCase = new CreateComparisonCommand(repo);
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ code: 'unauthorized', message: 'Unauthorized' }, 401);
    }
    const userProfileRepo = c.get<TursoUserProfileRepository>('userProfileRepository');
    const profile = await ensureUserProfile(userProfileRepo, user.uid, user);
    const comparison = await useCase.execute({
      id: crypto.randomUUID(),
      ownerId: profile.id,
      title: body.title,
      summary: body.summary,
      tags: body.tags ?? [],
      variants: body.variants.map((variant, index) => ({
        id: crypto.randomUUID(),
        label: variant.label,
        stackblitzUrl: variant.stackblitzUrl,
        thumbnailUrl: variant.thumbnailUrl ?? null,
        displayOrder: variant.displayOrder ?? index,
        createdAt: new Date(),
      })),
    });
    return c.json({ data: comparison }, 201);
  });

  app.patch('/api/v1/comparisons/:id', zValidator('json', updateComparisonSchema), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const repo = c.get<TursoComparisonRepository>('comparisonRepository');
    const useCase = new UpdateComparisonCommand(repo);
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ code: 'unauthorized', message: 'Unauthorized' }, 401);
    }
    const userProfileRepo = c.get<TursoUserProfileRepository>('userProfileRepository');
    const profile = await ensureUserProfile(userProfileRepo, user.uid, user);
    const comparison = await useCase.execute({
      id,
      ownerId: profile.id,
      title: body.title,
      summary: body.summary,
      tags: body.tags,
      variants: body.variants?.map((variant) => ({
        id: crypto.randomUUID(),
        label: variant.label,
        stackblitzUrl: variant.stackblitzUrl,
        thumbnailUrl: variant.thumbnailUrl ?? null,
        displayOrder: variant.displayOrder,
        createdAt: new Date(),
      })),
    });
    return c.json({ data: comparison });
  });

  app.post('/api/v1/comparisons/:id/publish', zValidator('json', publishComparisonSchema), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const env = resolveEnv(c.env);
    const repo = c.get<TursoComparisonRepository>('comparisonRepository');
    const eventBus = c.get<InMemoryEventBus>('eventBus');
    const useCase = new PublishComparisonCommand(repo, eventBus);
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ code: 'unauthorized', message: 'Unauthorized' }, 401);
    }
    const userProfileRepo = c.get<TursoUserProfileRepository>('userProfileRepository');
    const profile = await ensureUserProfile(userProfileRepo, user.uid, user);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const comparison = await useCase.execute({
      id,
      ownerId: profile.id,
      expiresAt,
    });
    return c.json({ data: comparison });
  });

  app.get('/api/v1/me/comparisons', async (c) => {
    const repo = c.get<TursoComparisonRepository>('comparisonRepository');
    const useCase = new GetMyComparisonsQuery(repo);
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ code: 'unauthorized', message: 'Unauthorized' }, 401);
    }
    const userProfileRepo = c.get<TursoUserProfileRepository>('userProfileRepository');
    const profile = await ensureUserProfile(userProfileRepo, user.uid, user);
    const comparisons = await useCase.execute(profile.id);
    return c.json({ data: comparisons });
  });

  app.get('/api/v1/comparisons/:id/results', async (c) => {
    const comparisonId = c.req.param('id');
    const comparisonRepo = c.get<TursoComparisonRepository>('comparisonRepository');
    const voteRepo = c.get<TursoVoteRepository>('voteRepository');
    const useCase = new GetComparisonResultsQuery(comparisonRepo, voteRepo);
    const results = await useCase.execute(comparisonId);
    return c.json({ data: results });
  });

  app.post('/api/v1/votes', zValidator('json', voteSchema), async (c) => {
    const body = c.req.valid('json');
    const user = getAuthUser(c);
    if (!user) {
      return c.json({ code: 'unauthorized', message: 'Unauthorized' }, 401);
    }
    const comparisonRepo = c.get<TursoComparisonRepository>('comparisonRepository');
    const voteSessionRepo = c.get<TursoVoteSessionRepository>('voteSessionRepository');
    const voteRepo = c.get<TursoVoteRepository>('voteRepository');
    const turnstileVerifier = c.get<TurnstileVerifier>('turnstileVerifier');
    const rateLimiter = c.get<RateLimiter>('rateLimiter');
    const eventBus = c.get<InMemoryEventBus>('eventBus');
    const userProfileRepo = c.get<TursoUserProfileRepository>('userProfileRepository');
    const profile = await ensureUserProfile(userProfileRepo, user.uid, user);

    const useCase = new SubmitVoteCommand(
      comparisonRepo,
      voteSessionRepo,
      voteRepo,
      turnstileVerifier,
      rateLimiter,
      eventBus,
    );

    const profile = await ensureUserProfile(c.get('userProfileRepository'), user.uid, user);
    const { vote } = await useCase.execute({
      comparisonId: body.comparisonId,
      userId: profile.id,
      variantId: body.variantId,
      turnstileToken: body.turnstileToken,
      comment: body.comment ?? null,
    });

    return c.json({ data: vote }, 201);
  });
}

async function ensureUserProfile(
  repo: TursoUserProfileRepository,
  firebaseUid: string,
  firebaseUser: { email?: string; displayName?: string | null },
) {
  const existing = await repo.findByFirebaseUid(firebaseUid);
  if (existing) {
    return existing;
  }
  const profile = UserProfile.create({
    id: crypto.randomUUID(),
    firebaseUid,
    email: firebaseUser.email ?? null,
    displayName: firebaseUser.displayName ?? null,
    role: 'creator',
    createdAt: new Date(),
  });
  await repo.upsert(profile);
  return profile;
}
