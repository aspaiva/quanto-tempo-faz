CREATE OR REPLACE FUNCTION public.is_list_owner(_user_id uuid, _list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lists
    WHERE id = _list_id
      AND owner_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_list_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_list_owner(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_list_accessible(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_list_accessible(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can view lists" ON public.lists;
CREATE POLICY "Members can view lists"
ON public.lists
FOR SELECT
TO authenticated
USING (public.is_list_accessible(auth.uid(), id));

DROP POLICY IF EXISTS "Owner can manage members" ON public.list_members;
DROP POLICY IF EXISTS "Owner can view membership" ON public.list_members;
DROP POLICY IF EXISTS "Owner can add members" ON public.list_members;
DROP POLICY IF EXISTS "Owner can update members" ON public.list_members;
DROP POLICY IF EXISTS "Owner can delete members" ON public.list_members;

CREATE POLICY "Owner can view membership"
ON public.list_members
FOR SELECT
TO authenticated
USING (public.is_list_owner(auth.uid(), list_id));

CREATE POLICY "Owner can add members"
ON public.list_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_list_owner(auth.uid(), list_id));

CREATE POLICY "Owner can update members"
ON public.list_members
FOR UPDATE
TO authenticated
USING (public.is_list_owner(auth.uid(), list_id))
WITH CHECK (public.is_list_owner(auth.uid(), list_id));

CREATE POLICY "Owner can delete members"
ON public.list_members
FOR DELETE
TO authenticated
USING (public.is_list_owner(auth.uid(), list_id));