
-- Allow anyone authenticated to read a list by ID for joining purposes
CREATE OR REPLACE FUNCTION public.join_list(_list_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
BEGIN
  SELECT owner_id INTO _owner_id FROM public.lists WHERE id = _list_id;
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Lista não encontrada';
  END IF;
  IF _owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Você já é o dono desta lista';
  END IF;
  INSERT INTO public.list_members (list_id, user_id) VALUES (_list_id, auth.uid());
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já faz parte desta lista';
END;
$$;
