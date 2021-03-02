import { Dictionary } from 'ramda'
import useTerraAssets from '../hooks/useTerraAssets'

const useValidators = () => {
  return useTerraAssets<Dictionary<string>>('validators.json')
}

export default useValidators
