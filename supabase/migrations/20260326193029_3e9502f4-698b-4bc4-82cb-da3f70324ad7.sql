
DROP POLICY IF EXISTS "Members can view lists" ON public.lists;
CREATE POLICY "Members can view lists" ON public.lists
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.list_members
    WHERE list_members.list_id = lists.id
      AND list_members.user_id = auth.uid()
  )
);
