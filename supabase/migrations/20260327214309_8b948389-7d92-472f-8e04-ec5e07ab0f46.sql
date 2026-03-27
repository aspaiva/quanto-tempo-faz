
-- Allow list members to see events that belong to lists they have access to
CREATE POLICY "Members can view events in shared lists"
ON public.events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.list_events le
    WHERE le.event_id = events.id
      AND public.is_list_accessible(auth.uid(), le.list_id)
  )
);

-- Update list_events delete policy: owner of list OR owner of event can remove
DROP POLICY IF EXISTS "Owner and members can remove events from list" ON public.list_events;

CREATE POLICY "Owner or event owner can remove from list"
ON public.list_events
FOR DELETE
TO authenticated
USING (
  public.is_list_owner(auth.uid(), list_id)
  OR
  EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()
  )
);
