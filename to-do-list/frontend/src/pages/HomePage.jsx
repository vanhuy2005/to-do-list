import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function HomePage() {
    const handleTestToast = () => {
        toast.success("THÀNH CÔNG!", {
            description: "Công việc đã hoàn tất.",
        });
    };

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">HomePage</h1>
            <Button onClick={handleTestToast}>Test Toast Thành Công</Button>
        </div>
    );
}
