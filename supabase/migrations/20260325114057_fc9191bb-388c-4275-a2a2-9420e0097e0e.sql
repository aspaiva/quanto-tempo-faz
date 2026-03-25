
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE USING (auth.uid() = user_id);
