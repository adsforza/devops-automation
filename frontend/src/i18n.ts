import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
	es: { translation: { Dashboard: 'Dashboard' } },
	en: { translation: { Dashboard: 'Dashboard' } },
};

i18n.use(initReactI18next).init({
	resources,
	lng: 'es',
	fallbackLng: 'en',
	interpolation: { escapeValue: false },
});

export default i18n;