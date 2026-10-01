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
