/** A successful WebGL context alone does not prove hardware acceleration.
 * Renderer details can be hidden by privacy settings; absence stays unknown. */
export function hasSoftwareRenderer(gl: WebGL2RenderingContext): boolean {
  try {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer: unknown = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    return typeof renderer === 'string' && /\b(?:swiftshader|llvmpipe|softpipe|lavapipe)\b|microsoft basic render driver|software rasterizer|software renderer/i.test(renderer);
  } catch { return false; }
}

export const SOFTWARE_RENDERER_NOTE = 'O navegador está renderizando por software. Isso pode deixar o jogo lento. Confira a aceleração gráfica nas configurações do navegador e reinicie-o. Para aliviar, escolha 1x e desative as texturas HD.';
