"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

const resetPasswordFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export type ResetPasswordFormInputs = z.infer<typeof resetPasswordFormSchema>;

export function ResetPasswordForm() {
  const { sendPasswordResetEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResetPasswordFormInputs>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormInputs) {
    setIsLoading(true);
    setEmailSent(false);
    try {
      await sendPasswordResetEmail(values.email);
      toast({ 
        title: "Password Reset Email Sent", 
        description: "Please check your inbox for instructions to reset your password." 
      });
      setEmailSent(true);
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description: error.message || "Could not send password reset email. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
           <KeyRound size={32} />
        </div>
        <CardTitle className="font-headline text-3xl">Reset Password</CardTitle>
        <CardDescription>
          {emailSent 
            ? "A password reset link has been sent to your email."
            : "Enter your email to receive a password reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!emailSent && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex-col items-center">
        <Link href="/login" legacyBehavior>
          <a className="text-sm text-primary hover:underline">Back to Sign In</a>
        </Link>
      </CardFooter>
    </Card>
  );
}
