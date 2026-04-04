import { Link } from "react-router-dom";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function FAB({ to = "/tasks/new", label = "Tao Task" }) {
  return (
    <div className="fixed right-4 bottom-18 z-30">
      <Button asChild className="rounded-full px-4" size="lg">
        <Link to={to}>
          <PlusIcon className="size-4" />
          <span>{label}</span>
        </Link>
      </Button>
    </div>
  );
}
