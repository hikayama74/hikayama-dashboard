// ブラウザ向け node:util スタブ（SDK の Node 専用経路用、ブラウザでは未使用）。
export function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, result) => (err ? reject(err) : resolve(result)))
    })
}
export default { promisify }
