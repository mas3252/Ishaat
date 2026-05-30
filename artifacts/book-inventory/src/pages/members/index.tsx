import { useState } from "react";
import { useListMembers, useDeleteMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreVertical, Users, Trash2, Eye, UserX } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: members, isLoading } = useListMembers({ search: search || undefined });
  const deleteMember = useDeleteMember();

  function handleDelete() {
    if (!deleteId) return;
    deleteMember.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: "Member removed" });
        setDeleteId(null);
      },
      onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-1">Manage registered library members.</p>
        </div>
        <Button asChild data-testid="button-add-member">
          <Link href="/members/new"><Plus className="h-4 w-4 mr-2" />Add Member</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search-members"
          placeholder="Search by name, code, or email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !members?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <UserX className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p className="font-medium text-base">
              {search ? "No members match your search" : "No members registered yet"}
            </p>
            {!search && (
              <Button asChild className="mt-4">
                <Link href="/members/new"><Plus className="h-4 w-4 mr-2" />Add Member</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id} data-testid={`card-member-${member.id}`} className="hover:bg-accent/30 transition-colors">
              <CardContent className="py-3 px-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{member.name}</p>
                    <Badge variant="outline" className="text-xs font-mono">{member.memberCode}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email ?? "No email"}{member.phone ? ` · ${member.phone}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {(member.activeLoansCount ?? 0) > 0 ? (
                    <Badge variant="default" className="text-xs">{member.activeLoansCount} borrowed</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">No active loans</Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-member-${member.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/members/${member.id}`}><Eye className="h-4 w-4 mr-2" />View profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteId(member.id)}
                      data-testid={`button-delete-member-${member.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the member record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
