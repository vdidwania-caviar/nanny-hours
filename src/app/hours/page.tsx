"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const weekdays = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
] as const;

type WeekdayKey = (typeof weekdays)[number]["key"];

type HoursMap = Record<WeekdayKey, string>;

type ExtraItem = {
  id: string;
  label: string;
  amount: number;
};

type FeedbackState =
  | { type: "success" | "error"; message: string }
  | null;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const weekRangeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const toDecimal = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const createEmptyHours = (): HoursMap =>
  weekdays.reduce<HoursMap>((acc, day) => {
    acc[day.key] = "";
    return acc;
  }, {} as HoursMap);

const getWeekStart = (date: Date): Date => {
  const copy = new Date(date);
  const currentDay = copy.getDay();
  const distance = currentDay === 0 ? -6 : 1 - currentDay;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + distance);
  return copy;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  return `${weekRangeFormatter.format(weekStart)} – ${weekRangeFormatter.format(
    weekEnd,
  )}`;
};

const normalizeExtras = (items: unknown): ExtraItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const label =
      typeof item?.label === "string" && item.label.trim().length > 0
        ? item.label
        : "Reimbursement";
    const amount = toDecimal(item?.amount);
    const id =
      typeof item?.id === "string" && item.id.length > 0
        ? item.id
        : generateId();
    return { id, label, amount };
  });
};

const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
};

const MissingEnvNotice = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
    <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-lg shadow-slate-200">
      <p className="text-lg font-semibold text-slate-900">
        Add your Supabase keys
      </p>
      <p className="mt-3 text-sm text-slate-600">
        Place <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> inside a{" "}
        <code>.env.local</code> file, then restart the dev server.
      </p>
    </div>
  </div>
);

export default function Home() {
  const supabase = useMemo<SupabaseClient | null>(
    () => getSupabaseBrowserClient(),
    [],
  );

  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(new Date()),
  );
  const [hours, setHours] = useState<HoursMap>(() => createEmptyHours());
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [rateStatus, setRateStatus] = useState<FeedbackState>(null);
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [extrasTitle, setExtrasTitle] = useState("");
  const [extrasAmount, setExtrasAmount] = useState("");
  const [status, setStatus] = useState<FeedbackState>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingDay, setSavingDay] = useState<WeekdayKey | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);

  const weekKey = formatDateKey(weekStart);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    const fetchWeek = async () => {
      setIsFetching(true);
      setStatus(null);
      try {
        const { data, error } = await supabase
          .from("weekly_logs")
          .select("hourly_rate, hours, extras")
          .eq("week_start", weekKey)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          setStatus({
            type: "error",
            message: "Could not load that week. Try again.",
          });
          setHours(createEmptyHours());
          setExtras([]);
          return;
        }

        if (data) {
          const storedHours = createEmptyHours();
          const payload = (data.hours || {}) as Record<string, unknown>;
          weekdays.forEach((day) => {
            const value = toDecimal(payload[day.key]);
            storedHours[day.key] =
              value === 0 ? "" : Number(value.toFixed(2)).toString();
          });

          setHours(storedHours);
          setExtras(normalizeExtras(data.extras));
        } else {
          setHours(createEmptyHours());
          setExtras([]);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus({
            type: "error",
            message: "Something went wrong. Please refresh.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };

    fetchWeek();

    return () => {
      cancelled = true;
    };
  }, [supabase, weekKey]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    const fetchHourlyRate = async () => {
      setIsRateLoading(true);
      setRateStatus(null);
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("numeric_value")
          .eq("name", "hourly_rate")
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          setRateStatus({
            type: "error",
            message: "Could not load saved hourly rate.",
          });
          return;
        }

        if (data?.numeric_value !== null && data?.numeric_value !== undefined) {
          const numeric = Number(data.numeric_value);
          setHourlyRate(
            numeric % 1 === 0 ? numeric.toString() : numeric.toFixed(2),
          );
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setRateStatus({
            type: "error",
            message: "Error fetching hourly rate.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsRateLoading(false);
        }
      }
    };

    fetchHourlyRate();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!supabase) {
    return <MissingEnvNotice />;
  }

  const totalHours = weekdays.reduce(
    (sum, day) => sum + toDecimal(hours[day.key]),
    0,
  );
  const hourlyRateNumber = toDecimal(hourlyRate);
  const extrasTotal = extras.reduce((sum, item) => sum + item.amount, 0);
  const basePay = totalHours * hourlyRateNumber;
  const projectedTotal = basePay + extrasTotal;

  const handleWeekShift = (delta: number) => {
    setWeekStart((prev) => {
      const copy = new Date(prev);
      copy.setDate(copy.getDate() + delta * 7);
      return getWeekStart(copy);
    });
  };

  const handleWeekInput = (value: string) => {
    if (!value) {
      return;
    }
    const nextDate = new Date(value);
    if (Number.isNaN(nextDate.getTime())) {
      return;
    }
    setWeekStart(getWeekStart(nextDate));
  };

  const handleHoursChange = (day: WeekdayKey, value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: value,
    }));
  };

  const handleAddExtra = () => {
    const cleanedAmount = toDecimal(extrasAmount);
    if (cleanedAmount === 0) {
      setExtrasAmount("");
      return;
    }

    const label =
      extrasTitle.trim().length > 0 ? extrasTitle.trim() : "Reimbursement";

    setExtras((prev) => [
      ...prev,
      {
        id: generateId(),
        label,
        amount: Number(cleanedAmount.toFixed(2)),
      },
    ]);
    setExtrasTitle("");
    setExtrasAmount("");
  };

  const handleRemoveExtra = (id: string) => {
    setExtras((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveRate = async () => {
    if (!supabase) {
      return;
    }

    const numericValue = Number(toDecimal(hourlyRate).toFixed(2));
    if (numericValue <= 0) {
      setRateStatus({
        type: "error",
        message: "Enter an hourly rate above 0.",
      });
      return;
    }

    setIsSavingRate(true);
    setRateStatus(null);

    try {
      const { error } = await supabase
        .from("settings")
        .upsert(
          { name: "hourly_rate", numeric_value: numericValue },
          { onConflict: "name" },
        );

      if (error) {
        setRateStatus({
          type: "error",
          message: "Could not save hourly rate.",
        });
        return;
      }

      setHourlyRate(
        numericValue % 1 === 0 ? numericValue.toString() : numericValue.toFixed(2),
      );
      setRateStatus({
        type: "success",
        message: "Hourly rate saved.",
      });
      setIsEditingRate(false);
    } catch (err) {
      console.error(err);
      setRateStatus({
        type: "error",
        message: "Unexpected error saving hourly rate.",
      });
    } finally {
      setIsSavingRate(false);
    }
  };

  const saveWeek = async (origin: "week" | WeekdayKey) => {
    if (!supabase) {
      return;
    }

    setStatus(null);

    if (!hourlyRate || hourlyRateNumber <= 0) {
      setStatus({
        type: "error",
        message: "Enter and save an hourly rate first.",
      });
      return;
    }

    const normalizedHours = weekdays.reduce<Record<string, number>>(
      (acc, day) => {
        const decimal = toDecimal(hours[day.key]);
        acc[day.key] = Number(decimal.toFixed(2));
        return acc;
      },
      {},
    );

    try {
      const { error } = await supabase
        .from("weekly_logs")
        .upsert(
          {
            week_start: weekKey,
            hourly_rate: Number(hourlyRateNumber.toFixed(2)),
            hours: normalizedHours,
            extras,
          },
          { onConflict: "week_start" },
        );

      if (error) {
        setStatus({
          type: "error",
          message: "Could not save. Double-check your Supabase table.",
        });
        return;
      }

      const dayLabel =
        origin === "week"
          ? null
          : weekdays.find((day) => day.key === origin)?.label ?? "Day";

      setStatus({
        type: "success",
        message:
          origin === "week"
            ? "Week saved to Supabase."
            : `${dayLabel} saved.`,
      });
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: "Unexpected error while saving.",
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveWeek("week");
    setIsSaving(false);
  };

  const handleSaveDay = async (day: WeekdayKey) => {
    setSavingDay(day);
    await saveWeek(day);
    setSavingDay(null);
  };

  const formattedWeekInputValue = formatDateKey(weekStart);
  const formattedWeekRange = formatWeekRange(weekStart);
  const formattedLongDate = longDateFormatter.format(weekStart);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">
            Week of {formattedLongDate}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            {formattedWeekRange}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-8 text-lg">
            <div>
              <p className="text-sm text-slate-300">Running total</p>
              <p className="text-3xl font-semibold">
                {totalHours.toFixed(2)} hrs
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-300">Projected payout</p>
              <p className="text-3xl font-semibold">
                {currencyFormatter.format(projectedTotal)}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
                Pick a week
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formattedWeekRange}
              </p>
            </div>
            {isFetching ? (
              <span className="text-sm text-slate-500">Loading…</span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleWeekShift(-1)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              ← Previous
            </button>
            <input
              type="date"
              value={formattedWeekInputValue}
              onChange={(event) => handleWeekInput(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-inner focus:border-slate-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleWeekShift(1)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Next →
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <div className="flex flex-col gap-4 rounded-[32px] border border-slate-100 bg-slate-50/60 px-6 py-5 text-slate-900 shadow-inner sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
                Hourly rate
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {hourlyRateNumber > 0
                  ? currencyFormatter.format(hourlyRateNumber)
                  : isRateLoading
                    ? "Loading…"
                    : "Not saved yet"}
                {hourlyRateNumber > 0 ? (
                  <span className="ml-2 text-base font-medium text-slate-500">
                    /hr
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingRate((prev) => !prev)}
              className="rounded-full border-2 border-blue-500 px-6 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              {isEditingRate ? "Close" : hourlyRateNumber > 0 ? "Edit rate" : "Set rate"}
            </button>
          </div>
          {isEditingRate ? (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-inner">
              <p className="text-sm text-slate-500">
                Save once, used for every week. Update any time.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <div className="text-3xl font-semibold text-slate-900">$</div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={hourlyRate}
                    onChange={(event) => setHourlyRate(event.target.value)}
                    placeholder="18"
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-3xl font-semibold text-slate-900 shadow-inner focus:border-slate-900 focus:outline-none"
                  />
                  <span className="text-lg font-medium text-slate-500">/hr</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRate}
                  disabled={isSavingRate}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSavingRate ? "Saving…" : "Save rate"}
                </button>
              </div>
              {rateStatus ? (
                <p
                  className={`mt-3 text-sm ${
                    rateStatus.type === "success" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {rateStatus.message}
                </p>
              ) : null}
            </div>
          ) : rateStatus ? (
            <p
              className={`mt-3 text-sm ${
                rateStatus.type === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {rateStatus.message}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
              Daily hours
            </p>
            <span className="text-sm text-slate-500">
              Running total: {totalHours.toFixed(2)} hrs
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {weekdays.map((day) => {
              const inputId = `hours-${day.key}`;
              const isDaySaving = savingDay === day.key;
              return (
                <div key={day.key} className="flex items-center gap-3">
                  <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-inner">
                    <label
                      htmlFor={inputId}
                      className="text-sm font-semibold text-slate-500"
                    >
                      {day.label}
                    </label>
                    <input
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      step="0.25"
                      min="0"
                      value={hours[day.key]}
                      onChange={(event) =>
                        handleHoursChange(day.key, event.target.value)
                      }
                      placeholder="0"
                      className="mt-2 w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-3xl font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <span className="mt-1 block text-xs uppercase tracking-[0.3em] text-slate-400">
                      {day.short}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveDay(day.key)}
                    disabled={isDaySaving || isSaving}
                    className="rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDaySaving ? "…" : "Save"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Extras / reimbursements
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={extrasTitle}
              onChange={(event) => setExtrasTitle(event.target.value)}
              placeholder="Groceries"
              className="flex-1 appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 [color-scheme:light] [-webkit-text-fill-color:#0f172a] focus:border-slate-900 focus:outline-none"
            />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={extrasAmount}
              onChange={(event) => setExtrasAmount(event.target.value)}
              placeholder="45"
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 [color-scheme:light] [-webkit-text-fill-color:#0f172a] focus:border-slate-900 focus:outline-none sm:w-32"
            />
            <button
              type="button"
              onClick={handleAddExtra}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {extras.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    extra
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-slate-900">
                    {currencyFormatter.format(item.amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveExtra(item.id)}
                    className="text-sm text-slate-500 transition hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {extras.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                Nothing added yet.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Weekly summary
          </p>
          <div className="mt-3 space-y-3 text-base">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total hours</span>
              <span className="font-semibold text-slate-900">
                {totalHours.toFixed(2)} hrs
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hourly pay</span>
              <span className="font-semibold text-slate-900">
                {currencyFormatter.format(basePay)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Extras</span>
              <span className="font-semibold text-slate-900">
                {currencyFormatter.format(extrasTotal)}
              </span>
            </div>
            <hr className="border-dashed border-slate-200" />
            <div className="flex items-center justify-between text-xl font-semibold text-slate-900">
              <span>Amount due</span>
              <span>{currencyFormatter.format(projectedTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-6 w-full rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSaving ? "Saving…" : "Save this week"}
          </button>
          {status ? (
            <p
              className={`mt-3 text-sm ${
                status.type === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {status.message}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
