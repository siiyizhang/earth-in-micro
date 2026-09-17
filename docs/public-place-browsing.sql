-- Places and visit notes are public community content. Allow guest reads.
-- Keep all write policies and private/draft observation policies unchanged.
begin;
alter policy "places are visible" on public.places to anon, authenticated using (true);
alter policy "visits are visible" on public.visits to anon, authenticated using (true);
grant select on public.places, public.visits to anon;
grant execute on function public.places_in_view(double precision, double precision, double precision, double precision, integer) to anon;
grant execute on function public.place_log(uuid) to anon;
commit;
