// ブラウザ向け node:stream/promises スタブ（SDK の Node 専用経路用、ブラウザでは未使用）。
export async function pipeline() {
  throw new Error('node:stream/promises pipeline はブラウザでは利用できません')
}
export default { pipeline }
