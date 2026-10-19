"use client";

import Link from "next/link";
import Icon from "./Icon";
import { MEAL_LABEL, type Entry } from "@/lib/types";
import { formatTime, groupByMeal, kcal } from "@/lib/nutrition";

/** Meals grouped into sections with the time of the first item; rows open the editor, or show a delete button in edit mode. */
export default function MealSections({
  entries,
  edit = false,
  onDelete,
}: {
  entries: Entry[];
  edit?: boolean;
  onDelete?: (e: Entry) => void;
}) {
  const groups = groupByMeal(entries);
  return (
    <>
      {groups.map((g) => (
        <section key={g.meal} className="sec" aria-label={MEAL_LABEL[g.meal]}>
          <div className="sec-head">
            <span className="sec-name">{MEAL_LABEL[g.meal]}</span>
            <span className="sec-time">{formatTime(g.items[0].loggedAt)}</span>
            <span className="sec-kcal">
              {kcal(g.kcal)}
              <span className="sec-unit"> kcal</span>
            </span>
          </div>
          {g.items.map((e) => {
            const body = (
              <>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="line-name">{e.name}</span>
                  <span className="line-sub">{e.serving}</span>
                </span>
                <span className="line-kcal">{kcal(e.calories)}</span>
              </>
            );
            return edit ? (
              <div key={e.id} className="line">
                <button type="button" className="line-del" aria-label={`Delete ${e.name}`} onClick={() => onDelete?.(e)}>
                  <Icon name="trash" size={20} />
                </button>
                {body}
              </div>
            ) : (
              <Link key={e.id} href={`/edit/${e.id}`} className="line">
                {body}
              </Link>
            );
          })}
        </section>
      ))}
    </>
  );
}
