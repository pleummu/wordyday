// jsdom may lack HTMLDialogElement.showModal/close; this mimics the open attribute.
// close() is always wrapped so it dispatches a native-style 'close' event (only
// when the dialog was open), which the Modal's browser-close handling relies on.
export function stubDialog(): void {
  const proto = globalThis.HTMLDialogElement?.prototype
  if (!proto) return
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
