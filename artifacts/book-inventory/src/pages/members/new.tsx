import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const formSchema = z.object({
  memberCode: z.string().min(1, "Member code is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewMember() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { memberCode: "", name: "", email: "", phone: "" },
  });

  const createMember = useCreateMember();

  function onSubmit(values: FormValues) {
    const { email, ...rest } = values;
    createMember.mutate({
      data: { ...rest, ...(email ? { email } : {}) }
    }, {
      onSuccess: (member) => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: `${member.name} added as a member` });
        setLocation(`/members/${member.id}`);
      },
      onError: () => toast({ title: "Failed to add member", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/members"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Member</h1>
          <p className="text-muted-foreground mt-0.5">Register a new library member.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="memberCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member Code</FormLabel>
                <FormControl>
                  <Input data-testid="input-member-code" placeholder="e.g. LIB005" {...field} className="font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input data-testid="input-member-name" placeholder="Full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (optional)</FormLabel>
                <FormControl>
                  <Input data-testid="input-member-email" type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input data-testid="input-member-phone" type="tel" placeholder="555-0100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-2">
            <Button data-testid="button-submit-member" type="submit" disabled={createMember.isPending}>
              {createMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
