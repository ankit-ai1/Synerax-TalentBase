"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Profile } from "@/lib/types";
import { TaskDialog, type TaskPrefill } from "./task-dialog";
import { InterviewDialog, type InterviewPrefill } from "./interview-dialog";
import { FeedbackDialog } from "./feedback-dialog";
import { AddToJobDialog } from "./add-to-job-dialog";
import { ShortlistDialog } from "./shortlist-dialog";
import { MessageDialog, type MessagePrefill } from "./message-dialog";
import { StageDialog, type StagePrefill } from "./stage-dialog";

type Ctx = {
  openTask: (p: TaskPrefill) => void;
  openInterview: (p: InterviewPrefill) => void;
  openFeedback: (interviewId: string, onDone?: () => void) => void;
  openAddToJob: (candidateIds: string[], onDone?: () => void) => void;
  openShortlist: (candidateIds: string[], onDone?: () => void) => void;
  openMessage: (p: MessagePrefill) => void;
  openStage: (p: StagePrefill) => void;
};

const DialogsCtx = createContext<Ctx>({
  openTask: () => {},
  openInterview: () => {},
  openFeedback: () => {},
  openAddToJob: () => {},
  openShortlist: () => {},
  openMessage: () => {},
  openStage: () => {},
});

export const useDialogs = () => useContext(DialogsCtx);

export function DialogsProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [task, setTask] = useState<TaskPrefill | null>(null);
  const [interview, setInterview] = useState<InterviewPrefill | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; onDone?: () => void } | null>(null);
  const [toJob, setToJob] = useState<{ ids: string[]; onDone?: () => void } | null>(null);
  const [shortlist, setShortlist] = useState<{ ids: string[]; onDone?: () => void } | null>(null);
  const [message, setMessage] = useState<MessagePrefill | null>(null);
  const [stage, setStage] = useState<StagePrefill | null>(null);

  const value: Ctx = {
    openTask: useCallback((p) => setTask(p), []),
    openInterview: useCallback((p) => setInterview(p), []),
    openFeedback: useCallback((id, onDone) => setFeedback({ id, onDone }), []),
    openAddToJob: useCallback((ids, onDone) => setToJob({ ids, onDone }), []),
    openShortlist: useCallback((ids, onDone) => setShortlist({ ids, onDone }), []),
    openMessage: useCallback((p) => setMessage(p), []),
    openStage: useCallback((p) => setStage(p), []),
  };

  return (
    <DialogsCtx.Provider value={value}>
      {children}
      {task && <TaskDialog prefill={task} me={profile} onClose={() => setTask(null)} />}
      {interview && <InterviewDialog prefill={interview} me={profile} onClose={() => setInterview(null)} />}
      {feedback && <FeedbackDialog interviewId={feedback.id} onDone={feedback.onDone} onClose={() => setFeedback(null)} />}
      {toJob && <AddToJobDialog candidateIds={toJob.ids} onDone={toJob.onDone} onClose={() => setToJob(null)} />}
      {shortlist && <ShortlistDialog candidateIds={shortlist.ids} onDone={shortlist.onDone} onClose={() => setShortlist(null)} />}
      {message && <MessageDialog prefill={message} me={profile} onClose={() => setMessage(null)} />}
      {stage && <StageDialog prefill={stage} onClose={() => setStage(null)} />}
    </DialogsCtx.Provider>
  );
}
