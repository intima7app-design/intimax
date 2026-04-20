-- Allow authenticated users to insert notifications targeting other users
-- (e.g. follow, subscribe, message, tip, unlock). The actor must be the
-- current user; users cannot send notifications to themselves and cannot
-- forge actor identity.
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = actor_id
  AND user_id <> auth.uid()
);

-- Enable Realtime on notifications and messages so the UI can react live.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;