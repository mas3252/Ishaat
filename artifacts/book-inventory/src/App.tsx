import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Books from "@/pages/books/index";
import NewBook from "@/pages/books/new";
import ScanBooks from "@/pages/books/scan";
import BookDetail from "@/pages/books/[id]";
import Members from "@/pages/members/index";
import NewMember from "@/pages/members/new";
import MemberDetail from "@/pages/members/[id]";
import Loans from "@/pages/loans/index";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        <Route path="/books" component={Books} />
        <Route path="/books/new" component={NewBook} />
        <Route path="/books/scan" component={ScanBooks} />
        <Route path="/books/:id" component={BookDetail} />
        
        <Route path="/members" component={Members} />
        <Route path="/members/new" component={NewMember} />
        <Route path="/members/:id" component={MemberDetail} />
        
        <Route path="/loans" component={Loans} />
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
