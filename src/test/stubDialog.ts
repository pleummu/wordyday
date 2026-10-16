// jsdom has no HTMLDialogElement.showModal/close; this mimics the open attribute.
export function stubDialog(): void {
  const proto = globalThis.HTMLDialogElement?.prototype
  if (!proto) return
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
}
