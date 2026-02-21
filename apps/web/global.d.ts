import enNavigation from './messages/en/navigation.json';
import enCommon from './messages/en/common.json';
import enForms from './messages/en/forms.json';
import enAuth from './messages/en/auth.json';
import enDashboard from './messages/en/dashboard.json';
import enLogin from './messages/en/login.json';

type Messages = {
    navigation: typeof enNavigation;
    common: typeof enCommon;
    forms: typeof enForms;
    auth: typeof enAuth;
    dashboard: typeof enDashboard;
    login: typeof enLogin;
};

declare global {
    // Use type safe message keys with `next-intl`
    interface IntlMessages extends Messages { }
}
