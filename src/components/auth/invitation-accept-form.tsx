"use client";

 import { useFormState, useFormStatus } from "react-dom";
 import { acceptInternalInvitation, type AcceptInvitationState } from "@/actions/workspace";

 interface InvitationAcceptFormProps {
     email: string;
     token: string;
 }

 function SubmitButton() {
     const { pending } = useFormStatus();
     return (
         <button
             type="submit"
             disabled={pending}
             className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-nearby-accent text-white hover:bg-nearby-dark disabled:opacity-50 disabled:cursor-not-allowed"
         >
             {pending ? "Creando cuenta..." : "Crear contraseña"}
         </button>
     );
 }

 export function InvitationAcceptForm({ email, token }: InvitationAcceptFormProps) {
     const initialState: AcceptInvitationState = { message: "", success: false };
     const [state, action] = useFormState(acceptInternalInvitation, initialState);

     return (
         <form action={action} className="space-y-4">
             <input type="hidden" name="token" value={token} />

             <div>
                 <label htmlFor="email" className="block text-sm font-medium text-dark-slate">
                     Correo electrónico
                 </label>
                 <input
                     id="email"
                     name="email"
                     type="email"
                     value={email}
                     disabled
                     className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm bg-gray-100 text-gray-500 sm:text-sm"
                 />
             </div>

             <div>
                 <label htmlFor="password" className="block text-sm font-medium text-dark-slate">
                     Nueva contraseña
                 </label>
                 <input
                     id="password"
                     name="password"
                     type="password"
                     placeholder="••••••••"
                     required
                     minLength={6}
                     className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                 />
                 {state?.errors?.password && (
                     <p className="mt-1 text-sm text-error-red">{state.errors.password}</p>
                 )}
             </div>

             <div>
                 <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-slate">
                     Confirmar contraseña
                 </label>
                 <input
                     id="confirmPassword"
                     name="confirmPassword"
                     type="password"
                     placeholder="••••••••"
                     required
                     minLength={6}
                     className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                 />
                 {state?.errors?.confirmPassword && (
                     <p className="mt-1 text-sm text-error-red">{state.errors.confirmPassword}</p>
                 )}
             </div>

             {state?.message && (
                 <div className={`p-3 rounded-md text-sm ${state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                     {state.message}
                 </div>
             )}

             <SubmitButton />
         </form>
     );
 }
