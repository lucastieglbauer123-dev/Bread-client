const checkbox = document.querySelector('#download-acknowledgement')
const downloadLink = document.querySelector('[data-download-link]')
if (checkbox && downloadLink) {
  const updateDownloadState = () => {
    downloadLink.setAttribute('aria-disabled', String(!checkbox.checked))
    if (checkbox.checked) downloadLink.removeAttribute('tabindex')
    else downloadLink.setAttribute('tabindex', '-1')
  }
  checkbox.addEventListener('change', updateDownloadState)
  updateDownloadState()
}
