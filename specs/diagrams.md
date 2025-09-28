# 図表集

## 1. ERD (Entity Relationship Diagram)
UI比較投票アプリにおける主要テーブルとリレーションを示す。

```mermaid
erDiagram
    users ||--o{ comparisons : owns
    comparisons ||--o{ comparison_variants : includes
    comparisons ||--o{ vote_sessions : receives
    vote_sessions ||--o{ votes : records
    comparisons ||--o{ comparison_tags : tagged

    users {
      uuid id PK
      string firebase_uid
      string display_name
      string email
      enum role
      datetime created_at
    }

    comparisons {
      uuid id PK
      uuid owner_id FK
      string title
      string summary
      enum status
      datetime published_at
      datetime expires_at
      datetime created_at
      datetime updated_at
    }

    comparison_variants {
      uuid id PK
      uuid comparison_id FK
      string label
      string stackblitz_url
      string thumbnail_url
      int display_order
      datetime created_at
    }

    vote_sessions {
      uuid id PK
      uuid comparison_id FK
      uuid user_id FK
      string turnstile_token
      datetime submitted_at
    }

    votes {
      uuid id PK
      uuid vote_session_id FK
      uuid variant_id FK
      string comment
      datetime created_at
    }

    comparison_tags {
      uuid id PK
      uuid comparison_id FK
      string tag
    }
```

## 2. ユースケース図 (Actors & Use Cases)
主要アクターとユースケースの関係を示す。

```mermaid
graph TD
    subgraph Actors
      A[閲覧者 / 投票者]
      B[UI投稿者]
      C[管理者]
      S[StackBlitz Webhook]
    end

    subgraph UseCases
      UC1((比較一覧を閲覧))
      UC2((比較詳細を閲覧))
      UC3((UIへ投票する))
      UC4((UIを投稿する))
      UC5((投稿内容を更新する))
      UC6((比較を公開する))
      UC7((ダッシュボードで結果を確認))
      UC8((集計を再計算する))
      UC9((StackBlitz更新を処理する))
    end

    A --> UC1
    A --> UC2
    A --> UC3
    B --> UC4
    B --> UC5
    B --> UC6
    B --> UC7
    C --> UC8
    S --> UC9
    UC6 --> UC3
    UC4 --> UC1
```

## 3. 投票シーケンス図
`SubmitVote` ユースケースの代表的なシーケンスを示す。

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant FE as フロントエンド
    participant API as API (Hono)
    participant APP as Application Service
    participant DOM as Domain Model
    participant DB as TursoDB
    participant TS as Turnstile

    U->>FE: 投票フォーム送信
    FE->>TS: Turnstile Token 検証
    TS-->>FE: 成功
    FE->>API: POST /api/v1/votes (token, variant)
    API->>APP: SubmitVoteCommand
    APP->>DOM: VoteSession 生成
    DOM->>DOM: 不変条件検証(未投票・期間内)
    DOM->>APP: VoteSession, Vote
    APP->>DB: 保存(トランザクション)
    DB-->>APP: OK
    APP-->>API: VoteSubmitted イベント
    API-->>FE: 200 OK (結果データ)
    FE-->>U: 投票完了表示
```

これらの図表は `specs/domain-model.md` および `specs/use-cases.md` と併せて使用し、開発時の参照とする。
