import useFCD from './useFCD'

export default () => {
  const response = useFCD<object>({ url: '/node_info' })
  return response
}
