// ブラウザ向け node:child_process スタブ（SDK の Node 専用経路用、ブラウザでは未使用）。
export function execFile() {
  throw new Error('node:child_process はブラウザでは利用できません')
}
export default { execFile }
