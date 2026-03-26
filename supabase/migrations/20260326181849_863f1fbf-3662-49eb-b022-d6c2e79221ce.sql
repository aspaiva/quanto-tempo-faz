
-- Lists table
CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- List members (shared access)
CREATE TABLE public.list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, user_id)
);

ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

-- Link events to lists
CREATE TABLE public.list_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, event_id)
);

ALTER TABLE public.list_events ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is owner or member of a list
CREATE OR REPLACE FUNCTION public.is_list_accessible(_user_id uuid, _list_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lists WHERE id = _list_id AND owner_id = _user_id
    UNION ALL
    SELECT 1 FROM public.list_members WHERE list_id = _list_id AND user_id = _user_id
  )
$$;

-- RLS for lists
CREATE POLICY "Owner can do everything on lists" ON public.lists
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view lists" ON public.lists
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.list_members WHERE list_id = id AND user_id = auth.uid()));

-- RLS for list_members
CREATE POLICY "Owner can manage members" ON public.list_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lists WHERE id = list_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists WHERE id = list_id AND owner_id = auth.uid()));

CREATE POLICY "Members can view membership" ON public.list_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS for list_events
CREATE POLICY "Owner and members can view list events" ON public.list_events
  FOR SELECT TO authenticated
  USING (public.is_list_accessible(auth.uid(), list_id));

CREATE POLICY "Owner and members can add events to list" ON public.list_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_list_accessible(auth.uid(), list_id));

CREATE POLICY "Owner and members can remove events from list" ON public.list_events
  FOR DELETE TO authenticated
  USING (public.is_list_accessible(auth.uid(), list_id));
