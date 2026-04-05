import { Link } from "react-router-dom";
import { ArrowLeftIcon, HouseIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFoundPage() {
    return (
        <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-lg overflow-hidden rounded-[1.8rem] bg-card comic-shadow">
                <div className="border-b-[3px] border-border bg-[#ffd400] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex size-10 items-center justify-center rounded-xl border-[3px] border-border bg-card comic-shadow -rotate-12">
                            <TriangleAlertIcon className="size-5 text-primary" />
                        </div>

                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-foreground/70">
                                Lỗi 404
                            </p>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                                Không tìm thấy trang
                            </h1>
                        </div>
                    </div>
                </div>

                <CardContent className="space-y-6 px-5 py-6 text-center">
                    <div className="mx-auto flex size-28 items-center justify-center rounded-full border-4 border-border bg-[radial-gradient(circle_at_30%_30%,#ffd400_0%,#ff7a59_35%,#1f7bdc_68%,#0d324d_100%)] comic-shadow">
                        <span className="text-5xl font-black uppercase text-white">404</span>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xl font-black uppercase tracking-tight text-foreground">
                            Trang này đã đi đâu mất rồi
                        </p>
                        <p className="text-sm font-bold text-muted-foreground">
                            Liên kết bạn mở không tồn tại hoặc đã bị chuyển hướng.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Button asChild className="h-12 rounded-2xl px-5 text-base uppercase">
                            <Link to="/">
                                <HouseIcon className="size-5" />
                                Về trang chủ
                            </Link>
                        </Button>

                        <Button asChild variant="secondary" className="h-12 rounded-2xl px-5 text-base uppercase">
                            <Link to="/profile">
                                <ArrowLeftIcon className="size-5" />
                                Quay lại
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
