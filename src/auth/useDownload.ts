import { useTranslation } from 'react-i18next'
import { Download } from '../types'

export default (): Download => {
  const { t } = useTranslation()

  return {
    title: t('Auth:Menu:Download Terra Station'),
    links: [
      {
        key: 'mac',
        label: 'Mac',
        link: 'https://www.terra.dev/station/Terra%20Station-1.1.0.dmg',
        ext: 'dmg',
      },
      {
        key: 'win',
        label: 'Windows',
        link:
          'https://www.terra.dev/station/Terra%20Station%20Setup%201.1.0.exe',
        ext: 'exe',
      },
      {
        key: 'linux',
        label: 'Linux',
        links: [
          {
            link:
              'https://terra.money/station/station-electron_1.1.1_amd64.deb',
            ext: 'deb',
          },
          {
            link:
              'https://terra.money/station/station-electron-1.1.1.x86_64.rpm',
            ext: 'rpm',
          },
        ],
      },
    ],
  }
}
