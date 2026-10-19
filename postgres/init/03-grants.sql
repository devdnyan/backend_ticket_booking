
GRANT CONNECT ON DATABASE ticket_booking TO ticket_app;
GRANT USAGE ON SCHEMA public TO ticket_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO ticket_app;

GRANT USAGE ON TYPE public.seat_status TO ticket_app;
GRANT USAGE ON TYPE public.booking_status TO ticket_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ticket_app;
