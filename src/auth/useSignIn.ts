import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SignIn, LocalUser, Field, TestPassword } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  list: LocalUser[]
  test: TestPassword
}

export default ({ list, test }: Props): SignIn => {
  const { t } = useTranslation()
  const { signIn } = useAuth()

  /* form */
  const [index, setIndex] = useState('0')
  const [password, setPassword] = useState('')
  const [incorrect, setIncorrect] = useState(false)

  const user = list[Number(index)]
  const { name } = user
  const disabled = password.length < 10

  const fields: Field[] = [
    {
      label: t('Auth:SignIn:Select account'),
      element: 'select',
      attrs: {
        id: 'name',
        name: 'name',
        value: index
      },
      options: list.map(({ name }, index) => ({
        value: String(index),
        children: name
      })),
      setValue: setIndex
    },
    {
      label: t('Auth:Form:Password'),
      element: 'input',
      attrs: {
        type: 'password',
        id: 'password',
        name: 'password',
        value: password,
        placeholder: t('Auth:Form:Must be at least 10 characters'),
        autoComplete: 'off',
        autoFocus: true
      },
      setValue: value => {
        setIncorrect(false)
        setPassword(value)
      },
      error: incorrect ? t('Auth:Form:Incorrect password') : undefined
    }
  ]

  const onSubmit = () => {
    test({ name, password }) ? signIn(user) : setIncorrect(true)
  }

  return {
    form: {
      title: t('Auth:Menu:Sign in'),
      fields,
      disabled,
      submitLabel: t('Common:Form:Next'),
      onSubmit: disabled ? undefined : onSubmit
    }
  }
}
