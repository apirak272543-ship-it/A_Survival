# Creator route gate browser evidence — 2026-08-27

## Scope

Repository: `A_Survival`. Route under test: `/creator-studio`. The player root was opened first, but the initial browser capture showed an empty DOM and was not accepted as a successful player-runtime smoke proof. The route gate was therefore tested independently and the limitation remains explicit.

## Verified browser observation

At `http://localhost:3000/creator-studio`, with no authenticated admin session, the route first rendered the Thai loading state `กำลังตรวจสอบสิทธิ์ผู้พัฒนา` and then settled to:

> `DEVELOPER ONLY` — `เข้า Creator Studio ไม่ได้`
>
> `กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset`

The page also exposed only the `กลับหน้าผู้เล่น` link. No pixel canvas, Builder form, texture controls, or player HUD was rendered for the unauthenticated session.

## Code path covered

`client/src/App.tsx` now routes an enabled `/creator-studio` request through `CreatorAccessGate`. The gate uses `useAuth()` and renders `CreatorStudio` only when the authenticated user has `role === "admin"`. The server-side `server/creatorRouter.ts` remains protected by `adminProcedure`; the client gate is an additional boundary and is not the authorization source of truth.

## Not claimed

This evidence does not prove an authenticated admin can use the Builder UI, because no admin browser session was available. It also does not prove a successful player-root render: the first root capture was blank and was not treated as acceptance evidence.

## Workbench route observation

At `http://localhost:3000/creator-workbench`, with the same unauthenticated browser state, the page settled to the same developer-only boundary:

> `DEVELOPER ONLY` — `เข้า Creator Studio ไม่ได้`
>
> `กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset`

The Workbench form and its world/structure/item/weapon panels were not rendered before authorization. This confirms route separation and deny behavior, but it is not an authenticated Workbench acceptance test.

## Registry UI boundary observation

After the registry `register`/`list` hooks were added to `CreatorStudio`, an unauthenticated visit to `http://localhost:3000/creator-studio` still settled to the same gate and exposed no Builder canvas or registry controls:

> `DEVELOPER ONLY` — `เข้า Creator Studio ไม่ได้`
>
> `กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset`

No authenticated admin session was available, so the registry upload/list UI was not claimed as end-to-end browser verified.
