const checkbox = document.querySelector('#download-acknowledgement')
const downloadLink = document.querySelector('[data-download-link]')
const downloadStatus = document.querySelector('[data-msi-status]')
if (checkbox && downloadLink) {
  let msiUrl = ''
  const updateDownloadState = () => {
    const ready = checkbox.checked && Boolean(msiUrl)
    downloadLink.setAttribute('aria-disabled', String(!ready))
    if (ready) downloadLink.removeAttribute('tabindex')
    else downloadLink.setAttribute('tabindex', '-1')
  }

  checkbox.addEventListener('change', updateDownloadState)
  updateDownloadState()
  if (downloadStatus) downloadStatus.textContent = 'Checking GitHub releases for a Windows MSI…'

  fetch('https://api.github.com/repos/lucastieglbauer123-dev/Bread-client/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' }
  })
    .then((response) => {
      if (!response.ok) throw new Error('No published release')
      return response.json()
    })
    .then((release) => {
      const asset = (release.assets || []).find((item) => /\.msi$/i.test(item.name) && item.state === 'uploaded')
      if (!asset) throw new Error('No MSI in the latest release')

      const url = new URL(asset.browser_download_url)
      if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/lucastieglbauer123-dev/Bread-client/releases/download/')) {
        throw new Error('Unexpected installer location')
      }

      msiUrl = url.href
      downloadLink.href = msiUrl
      downloadLink.textContent = 'Download Windows MSI'
      if (downloadStatus) downloadStatus.textContent = 'Latest MSI: ' + release.tag_name + '. Read the release notes before installing.'
      updateDownloadState()
    })
    .catch(() => {
      downloadLink.textContent = 'MSI not available'
      if (downloadStatus) downloadStatus.textContent = 'No Windows MSI is published yet. Check All releases for the next installer.'
      updateDownloadState()
    })
}

const settings = JSON.parse(localStorage.getItem('bread-site-settings') || '{}')
const applySettings = () => {
  document.documentElement.dataset.theme = settings.theme || 'charcoal'
  document.documentElement.dataset.text = settings.text || 'normal'
  document.documentElement.dataset.motion = settings.motion || 'full'
}
applySettings()

const nav = document.querySelector('.site-nav')
if (nav) {
  const trigger = document.createElement('button')
  trigger.className = 'settings-trigger'
  trigger.type = 'button'
  trigger.textContent = 'Settings'
  trigger.setAttribute('aria-haspopup', 'dialog')
  nav.append(trigger)

  const dialog = document.createElement('dialog')
  dialog.className = 'settings-dialog'
  dialog.setAttribute('aria-labelledby', 'site-settings-title')
  dialog.innerHTML = `<form method="dialog">
    <h2 id="site-settings-title">Site settings</h2>
    <p class="meta-line">A few controls for how this page feels. Nothing leaves this browser.</p>
    <fieldset><legend>Colour</legend>
      <label><input type="radio" name="site-theme" value="charcoal"> Charcoal and amber</label>
      <label><input type="radio" name="site-theme" value="paper"> Paper and toasted orange</label>
      <label><input type="radio" name="site-theme" value="ink"> Deep navy</label>
    </fieldset>
    <fieldset><legend>Text size</legend>
      <label><input type="radio" name="site-text" value="normal"> Normal</label>
      <label><input type="radio" name="site-text" value="large"> A little larger</label>
    </fieldset>
    <fieldset><legend>Motion</legend>
      <label><input type="radio" name="site-motion" value="full"> Keep normal motion</label>
      <label><input type="radio" name="site-motion" value="off"> Reduce motion</label>
    </fieldset>
    <div class="action-row"><button class="button secondary" value="cancel">Close</button></div>
  </form>`
  document.body.append(dialog)
  for (const input of dialog.querySelectorAll('input')) {
    const key = input.name.replace('site-', '')
    input.checked = (settings[key] || (key === 'theme' ? 'charcoal' : key === 'text' ? 'normal' : 'full')) === input.value
    input.addEventListener('change', () => {
      settings[key] = input.value
      localStorage.setItem('bread-site-settings', JSON.stringify(settings))
      applySettings()
    })
  }
  trigger.addEventListener('click', () => dialog.showModal())
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close() })
}
