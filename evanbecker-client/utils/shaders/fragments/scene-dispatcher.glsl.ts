export const SCENE_DISPATCHER = `
// === SCENE DISPATCHER ===

vec2 sceneSDF(vec3 p) {
  vec2 scene;
  if (u_scene == 0) scene = latticeScene(p);
  else if (u_scene == 1) scene = mandelbulbScene(p);
  else if (u_scene == 2) scene = csgScene(p);
  else scene = fractalDescentScene(p);

  return scene;
}

float sceneD(vec3 p) {
  return sceneSDF(p).x;
}
`
