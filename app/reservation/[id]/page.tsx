"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  MapPin,
  Hash,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Ban,
  Timer,
  Box,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import {
  getReservation,
  confirmReservation,
  releaseReservation,
} from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // ─── Fetch Reservation ─────────────────────────────────

  const {
    data: reservationData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["reservation", id],
    queryFn: () => getReservation(id),
    refetchInterval: 5000, // Refetch every 5 seconds to catch status changes
  });

  const reservation = reservationData?.data;

  // ─── Confirm Mutation ──────────────────────────────────

  const confirmMutation = useMutation({
    mutationFn: () => confirmReservation(id),
    onSuccess: () => {
      toast.success("Purchase confirmed!", {
        description: "Your order has been placed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["reservation", id] });
    },
    onError: (err: Error & { statusCode?: number }) => {
      if (err.statusCode === 410) {
        toast.error("Reservation expired", {
          description: "This reservation has expired. Please try again.",
        });
        queryClient.invalidateQueries({ queryKey: ["reservation", id] });
      } else if (err.statusCode === 409) {
        toast.error("Cannot confirm", {
          description: err.message,
        });
      } else {
        toast.error("Failed to confirm", {
          description: err.message,
        });
      }
    },
  });

  // ─── Release Mutation ──────────────────────────────────

  const releaseMutation = useMutation({
    mutationFn: () => releaseReservation(id),
    onSuccess: () => {
      toast.success("Reservation cancelled", {
        description: "Stock has been released back to inventory.",
      });
      queryClient.invalidateQueries({ queryKey: ["reservation", id] });
    },
    onError: (err: Error & { statusCode?: number }) => {
      if (err.statusCode === 409) {
        toast.error("Cannot cancel", {
          description: err.message,
        });
      } else {
        toast.error("Failed to cancel", {
          description: err.message,
        });
      }
    },
  });

  // ─── Loading State ─────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────

  if (isError || !reservation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Reservation Not Found
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {(error as Error)?.message ||
                "This reservation doesn't exist or has been removed."}
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Status Helpers ────────────────────────────────────

  const isPending = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  const isExpired =
    isPending && new Date(reservation.expiresAt) < new Date();

  const getStatusBadge = () => {
    if (isConfirmed)
      return (
        <Badge variant="success" className="text-sm px-4 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Confirmed
        </Badge>
      );
    if (isReleased)
      return (
        <Badge variant="secondary" className="text-sm px-4 py-1.5">
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          Released
        </Badge>
      );
    if (isExpired)
      return (
        <Badge variant="destructive" className="text-sm px-4 py-1.5">
          <Timer className="h-3.5 w-3.5 mr-1.5" />
          Expired
        </Badge>
      );
    return (
      <Badge variant="warning" className="text-sm px-4 py-1.5">
        <Timer className="h-3.5 w-3.5 mr-1.5" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Reservation Details
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ID: {reservation.id}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Countdown Timer - Only for pending reservations */}
      {isPending && !isExpired && (
        <Card className="border-indigo-200 dark:border-indigo-800/40 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <CardContent className="p-6">
            <CountdownTimer expiresAt={reservation.expiresAt} />
          </CardContent>
        </Card>
      )}

      {/* Expired Timer Banner */}
      {isExpired && (
        <Card className="border-red-200 dark:border-red-800/40 bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-950/20 dark:to-rose-950/20">
          <CardContent className="p-6">
            <CountdownTimer expiresAt={reservation.expiresAt} />
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {isConfirmed && (
        <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-800 dark:text-emerald-300">
                  Purchase Confirmed!
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Your order has been confirmed. Stock has been permanently
                  deducted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
              <Box className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xl">{reservation.product.name}</p>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {reservation.product.description}
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
              <MapPin className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Warehouse
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {reservation.warehouse.name}
                </p>
                <p className="text-xs text-slate-400">
                  {reservation.warehouse.location}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
              <Package className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Quantity
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {reservation.quantity} unit
                  {reservation.quantity > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-slate-400">
                  {formatPrice(
                    reservation.product.price * reservation.quantity
                  )}{" "}
                  total
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
              <Hash className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Unit Price
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(reservation.product.price)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Created
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(reservation.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Timeline
            </p>
            <div className="space-y-2">
              <TimelineItem
                label="Reserved"
                time={formatDate(reservation.createdAt)}
                active
              />
              <TimelineItem
                label="Expires"
                time={formatDate(reservation.expiresAt)}
                active={isPending}
                warning={isExpired}
              />
              {reservation.confirmedAt && (
                <TimelineItem
                  label="Confirmed"
                  time={formatDate(reservation.confirmedAt)}
                  success
                />
              )}
              {reservation.releasedAt && (
                <TimelineItem
                  label="Released"
                  time={formatDate(reservation.releasedAt)}
                  active
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          {isPending && !isExpired && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="success"
                size="lg"
                className="flex-1"
                onClick={() => confirmMutation.mutate()}
                disabled={
                  confirmMutation.isPending || releaseMutation.isPending
                }
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Purchase
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1"
                onClick={() => releaseMutation.mutate()}
                disabled={
                  confirmMutation.isPending || releaseMutation.isPending
                }
              >
                {releaseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Cancel Reservation
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Post-action state */}
          {(isConfirmed || isReleased || isExpired) && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Browse More Products
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Timeline Item Component ────────────────────────────

function TimelineItem({
  label,
  time,
  active,
  success,
  warning,
}: {
  label: string;
  time: string;
  active?: boolean;
  success?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          success
            ? "bg-emerald-500"
            : warning
            ? "bg-red-500"
            : active
            ? "bg-indigo-500"
            : "bg-slate-300"
        }`}
      />
      <div className="flex flex-1 items-center justify-between">
        <span
          className={`text-sm font-medium ${
            success
              ? "text-emerald-600 dark:text-emerald-400"
              : warning
              ? "text-red-600 dark:text-red-400"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {label}
        </span>
        <span className="text-xs text-slate-400">{time}</span>
      </div>
    </div>
  );
}
