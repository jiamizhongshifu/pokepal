/** Public contact details only. Never put tokens or private credentials here. */
export const PARENT_CONTACT = {
  operator: '钟师傅',
  email: 'drmrzhong@gmail.com',
  wechat: 'drmrzhong',
};
export const parentContactReady = Boolean(PARENT_CONTACT.operator && (PARENT_CONTACT.email || PARENT_CONTACT.wechat));
