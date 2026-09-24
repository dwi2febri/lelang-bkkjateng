export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "admin";
};
export type LoginInput = { email: string; password: string };
