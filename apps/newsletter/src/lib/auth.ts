import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (
          email !== process.env.ADMIN_EMAIL ||
          !process.env.ADMIN_PASSWORD_HASH_B64
        ) {
          return null;
        }

        const hash = Buffer.from(process.env.ADMIN_PASSWORD_HASH_B64, "base64").toString();
        const { compare } = await import("bcryptjs");
        const valid = await compare(password, hash);

        if (!valid) return null;

        return { id: "1", email, name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
});
