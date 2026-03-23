export const SCENE_DISPATCHER = `
// === SCENE DISPATCHER ===

vec2 sceneSDF(vec3 p) {
  vec2 scene;
  if (u_scene == 0) scene = latticeScene(p);
  else if (u_scene == 1) scene = mandelbulbScene(p);
  else if (u_scene == 2) scene = csgScene(p);
  else scene = fractalDescentScene(p);

  // Union with locally placed objects
  if (u_localObjectCount > 0) {
    vec2 local = evaluateLocalObjects(p);
    if (local.x < scene.x) {
      scene = vec2(
        opSmoothUnion(local.x, scene.x, 0.15),
        local.y
      );
    }
  }

  return scene;
}

float sceneD(vec3 p) {
  return sceneSDF(p).x;
}
`
