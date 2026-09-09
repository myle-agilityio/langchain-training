---
name: order-imports
description: Use when writing or editing import statements in apps/web source files. Documents the real informal ordering convention — there's no ESLint import-order rule enforcing it.
---

# Order imports

**Use this when:** touching import statements in `apps/web/src`. There is no
`import/order`/`simple-import-sort` plugin in `eslint.config.mjs` — only a stylistic
blank-line-after-imports rule. This is a convention to match for consistency, not a lint
error you'll hit if you don't.

## The pattern

Observed consistently across `EmailInbox/index.tsx` and `useSharedInbox.ts`:

```ts
import { useState } from "react";
import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

import type { EmailFilter } from "@/types";
import { useSharedInbox } from "@/hooks";
import { useComposeApproval } from "@/stores";
import { apiFetch } from "@/api";
import { Shell } from "@/components/generativeUI/toolCards/common";
import { formatDate } from "@/utils";

import { EmailDetail } from "./EmailDetail";
```

1. React/router, then third-party packages (`zod`, `lucide-react`, `@copilotkit/*`) — ungrouped
2. `@/types`
3. `@/hooks` / `@/stores` / `@/api` / `@/lib`
4. `@/components/*`
5. `@/utils`
6. Relative sibling imports (`./X`) last

No comment headers separating these — unlike some codebases' `// Components` /
`// Hooks` labels, this repo doesn't use them. Don't add them.

## Common mistakes

- Reordering an entire existing import block for an unrelated one-line edit — only touch
  what you're already changing.
- Deep-path imports instead of barrels (`@/components/common/Button/index` instead of
  `@/components/common`) — see [`shared`](../shared/SKILL.md)'s barrel rule.
- Mixing a relative sibling import in with the `@/*` group instead of keeping it last.
