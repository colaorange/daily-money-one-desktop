import { useContext } from "react"
import { I18nContext, I18nContextValue, I18nLabel } from "./I18nProvider"


export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider")
    }
    return context
}

export function useI18nLabel(): I18nLabel {
    const { label } = useI18n()
    return label
}

export default useI18n
