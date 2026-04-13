# PromptPet-AR Demo Validation Snapshot

日期：`2026-04-13`

这份快照记录了当前 demo prompt pack 的一次整包真实复跑结果。

目的不是证明“系统万能”，而是证明：

- 当前 demo prompt pack 都能走到真实 `ready`
- 当前首页主推的 live demo trio 是基于真实结果筛出来的
- 项目可以被当成一个稳定的小 demo，而不是只靠口头描述

## 执行命令

```bash
cd /Users/cloud/Code/PromptPet-AR
npm run demo:prompt-pack
```

## 结果总览

| Prompt | Generation ID | Status | Stop Reason | Quality | First Read | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 左耳小鱼 | `e33fcfd0-5d11-40c9-9268-4d33fa8eb95f` | `ready` | `quality-plateau` | `0.79` | `小鱼` | 可展示，但不建议做首页主推 |
| 双耳花饰 | `7b9fa083-9fc4-4b81-b5d0-9bdf41334704` | `ready` | `quality-plateau` | `0.80` | `小花 / 四叶草` | 适合作为扩展能力演示 |
| 胸前黑色围巾 | `6874ccb9-e223-4ff7-9934-bb3e25296570` | `ready` | `quality-plateau` | `0.87` | `小围巾` | 适合作为 live demo |
| 胸前金色校徽 | `aa34561e-e04f-4b4b-aae9-320a6d9b2105` | `ready` | `quality-plateau` | `0.80` | `别着校徽` | 胸前 rigid 样本里最稳 |
| 胸前小相机 | `3b349e4d-a823-4c31-bb2f-38676501dece` | `ready` | `partial-approximation` | `0.86` | `小相机` | 可展示主线能力，但不适合作为第一条 live demo |
| 右耳银色相机挂件 | `c6c657a1-5c7a-4d32-8d81-179749c4438c` | `ready` | `quality-accepted` | `0.92` | `相机` | 当前最强 live demo 样本 |

## 为什么首页主推这 3 条

当前首页 chips 固定为：

1. `胸前黑色小围巾`
2. `胸前金色校徽`
3. `右耳银色相机挂件`

原因：

- `右耳银色相机挂件` 是整包里唯一达到 `quality-accepted` 的样本
- `胸前黑色围巾` 和 `胸前金色校徽` 在 live 演示里更容易讲清楚“胸前 wrap / 胸前 rigid”两类差异
- `胸前小相机` 虽然已经不再退化成 `generic slab`，但当前仍是 `partial-approximation`，更适合放在第二轮讲“系统边界”

## 演示建议

- 第一轮 live demo：优先用首页 trio
- 第二轮补充能力：再展示 `胸前小相机`
- 如果想讲“多实例与更复杂 prompt”，再补 `双耳花饰`

## 诚实边界

- 这份快照只能证明当前 curated demo pack 可信
- 它不证明开放世界 prompt 都稳定
- 它不证明所有 case 都达到产品级高精度

这正是 PromptPet-AR 当前最合适的定位：

> 一个真实、可演示、诚实表达结果边界的小型 prompt-to-3D 桌宠 demo
