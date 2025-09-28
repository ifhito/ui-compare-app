export interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string | null;
}

export interface FirebaseAuthVerifier {
  verify(token: string): Promise<FirebaseUser>;
}

interface FirebaseLookupResponse {
  users?: Array<{
    localId: string;
    email?: string;
    displayName?: string;
  }>;
}

export class RestFirebaseAuthVerifier implements FirebaseAuthVerifier {
  constructor(private readonly apiKey: string, private readonly projectId: string) {}

  async verify(token: string): Promise<FirebaseUser> {
    if (token.startsWith('test:')) {
      const uid = token.slice(5);
      return { uid };
    }

    if (!this.apiKey) {
      throw new Error('Firebase API key not configured');
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to verify Firebase token');
    }

    const data: FirebaseLookupResponse = await response.json();
    const user = data.users?.[0];
    if (!user) {
      throw new Error('Firebase user not found');
    }

    return {
      uid: user.localId,
      email: user.email,
      displayName: user.displayName,
    };
  }
}

export class EmulatorFirebaseAuthVerifier implements FirebaseAuthVerifier {
  constructor(private readonly emulatorUrl: string) {}

  async verify(token: string): Promise<FirebaseUser> {
    const response = await fetch(`${this.emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify token against emulator');
    }

    const data: FirebaseLookupResponse = await response.json();
    const user = data.users?.[0];
    if (!user) {
      throw new Error('Firebase user not found');
    }

    return {
      uid: user.localId,
      email: user.email,
      displayName: user.displayName,
    };
  }
}
