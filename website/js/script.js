Sentry.init({
  dsn: 'http://7e9a678caf1a4da6ae5e92b814ea3191@localhost:8000/1',
  tracesSampleRate: 0.01,
})

async function setupDownloadLink() {
  const repo = 'simpledeadly/fleeets'
  const downloadButton = document.getElementById('download-button')
  const versionElement = document.getElementById('version-placeholder')

  if (!downloadButton) return

  // Устанавливаем запасной, но рабочий URL СРАЗУ
  const fallbackUrl = `https://github.com/${repo}/releases/latest`
  downloadButton.href = fallbackUrl

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`)

    // Если GitHub вернул ошибку (например, из-за лимита запросов)
    if (!response.ok) {
      // Мы не выбрасываем ошибку, а просто выходим, оставляя запасной URL
      console.warn(`GitHub API request failed with status: ${response.status}`)
      downloadButton.textContent = 'Скачать с GitHub' // Меняем текст на более понятный
      if (versionElement) versionElement.textContent = 'latest'
      return
    }

    const data = await response.json()

    const latestVersion = data.tag_name.replace('v', '')
    if (versionElement) {
      versionElement.textContent = latestVersion
    }

    // Ищем ассет для aarch64 (Apple Silicon) или x86_64 (Intel)
    const asset = data.assets.find(
      (asset) => asset.name.includes('aarch64.dmg') || asset.name.includes('x86_64.dmg')
    )

    if (asset) {
      downloadButton.href = asset.browser_download_url
      downloadButton.textContent = 'Скачать для macOS'
    } else {
      downloadButton.textContent = 'Скачать с GitHub'
    }
  } catch (error) {
    console.error('Failed to fetch release info:', error)

    Sentry.captureException(error)

    downloadButton.textContent = 'Посмотреть на GitHub'
    downloadButton.href = `https://github.com/${repo}/releases`
  }
}

document.addEventListener('DOMContentLoaded', setupDownloadLink)
