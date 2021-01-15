import { useTranslation } from 'react-i18next'
import { Download } from '../types'

export default (): Download => {
  const { t } = useTranslation()

  return {
    title: t('Auth:Menu:Download Terra Station'),
    links: [
      {
        key: 'mac',
        label: t('Auth:Download:For Mac'),
        link: 'https://www.terra.dev/station/Terra%20Station-1.1.0.dmg',
      },
      {
        key: 'win',
        label: t('Auth:Download:For Windows'),
        link:
          'https://www.terra.dev/station/Terra%20Station%20Setup%201.1.0.exe',
      },
    ],
  }
}
