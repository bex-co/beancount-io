import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";

export function PlaidLoadingState() {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaidErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h3 className="font-semibold text-lg">Failed to Load</h3>
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaidNotFoundState() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground mt-4">Institution not found</p>
        </div>
      </CardContent>
    </Card>
  );
}
