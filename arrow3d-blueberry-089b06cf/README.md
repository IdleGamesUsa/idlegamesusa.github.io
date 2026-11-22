# Arrow Trails 3D · Blueberry (v2)

A playable mockup for Pocket Puzzle Club. Original art and code only.
A dense neon maze of arrow lines coats a voxel blueberry. Drag to orbit,
pinch or wheel to zoom, tap an arrow to slide it off.

## 3D exit rule

Each arrow occupies a sequence of exposed voxel faces and has a single
head direction D, one of the six axis directions. When fired, the whole
arrow — every cell, even if the painted path bends — translates in
direction D and flies off the model.

Collision is a head-exit ray. The arrowhead occupies its parent voxel.
Look down direction D along a 5×5 integer corridor (the same row or up
to two rows away). The arrow may leave only if no cell of any other
remaining arrow sits in that corridor strictly in front of the head.
That is what lets an arrow be blocked by another on the far side of the
berry. The berry voxels themselves do not block, only remaining arrows.

Firing an already-legal arrow is always safe: blockers only disappear,
so a generated level cannot be bricked. A blocked tap flashes red and
costs a heart (3 hearts).

## Generate and test

```
node generate.js [seed]
node test.js
```

Frozen seed is 128001. The level lives in `level.js`.
