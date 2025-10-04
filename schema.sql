--
-- PostgreSQL database dump
--

\restrict aktYQnUys1oywaPM8cBNbYYqyaIK2UFJdHrBws3UT3VmNvY8zF4Y73IIBgbGT0A

-- Dumped from database version 17.5 (84bec44)
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id integer DEFAULT 1 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 10.00 NOT NULL,
    free_shipping_threshold numeric(10,2) DEFAULT 100.00 NOT NULL,
    large_order_quantity_threshold integer DEFAULT 10 NOT NULL,
    large_order_delivery_fee numeric(10,2) DEFAULT 50.00 NOT NULL,
    pickup_address text,
    currency_symbol character varying(5) DEFAULT '$'::character varying NOT NULL,
    currency_code character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row_check CHECK ((id = 1))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    event_title character varying(255) NOT NULL,
    event_type character varying(100),
    date date NOT NULL,
    "time" character varying(10),
    duration integer,
    location character varying(255),
    price numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('paid'::character varying)::text, ('partial'::character varying)::text]))),
    CONSTRAINT bookings_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('cancelled'::character varying)::text, ('completed'::character varying)::text])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    logo_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    product_id integer,
    quantity integer NOT NULL,
    size character varying(20),
    color character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cart_id integer,
    variant_id integer,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id integer NOT NULL,
    user_id integer,
    delivery_method character varying(20) DEFAULT 'delivery'::character varying,
    delivery_zone_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT carts_delivery_method_check CHECK (((delivery_method)::text = ANY (ARRAY[('pickup'::character varying)::text, ('delivery'::character varying)::text])))
);


--
-- Name: carts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carts_id_seq OWNED BY public.carts.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id integer,
    image_url character varying(500),
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: checkout_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout_sessions (
    id integer NOT NULL,
    user_id integer,
    delivery_method character varying(20) NOT NULL,
    delivery_zone_id integer,
    delivery_address_id integer,
    pickup_location_id integer,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0 NOT NULL,
    shipping_fee numeric(10,2) DEFAULT 0 NOT NULL,
    large_order_fee numeric(10,2) DEFAULT 0 NOT NULL,
    special_delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    payment_reference character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT checkout_sessions_delivery_method_check CHECK (((delivery_method)::text = ANY (ARRAY[('delivery'::character varying)::text, ('pickup'::character varying)::text]))),
    CONSTRAINT checkout_sessions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('paid'::character varying)::text, ('cancelled'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: checkout_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkout_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkout_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkout_sessions_id_seq OWNED BY public.checkout_sessions.id;


--
-- Name: communication_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_campaigns (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(10) NOT NULL,
    subject character varying(255),
    content text NOT NULL,
    target_segment character varying(255),
    target_customers text[],
    scheduled_date timestamp without time zone,
    sent_date timestamp without time zone,
    status character varying(20) DEFAULT 'draft'::character varying,
    open_rate numeric(5,2),
    click_rate numeric(5,2),
    delivery_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT communication_campaigns_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('scheduled'::character varying)::text, ('sent'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT communication_campaigns_type_check CHECK (((type)::text = ANY (ARRAY[('email'::character varying)::text, ('sms'::character varying)::text])))
);


--
-- Name: communication_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communication_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communication_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communication_campaigns_id_seq OWNED BY public.communication_campaigns.id;


--
-- Name: customer_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_activity (
    id integer NOT NULL,
    customer_id integer,
    type character varying(50) NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_activity_type_check CHECK (((type)::text = ANY (ARRAY[('purchase'::character varying)::text, ('login'::character varying)::text, ('email_open'::character varying)::text, ('email_click'::character varying)::text, ('sms_sent'::character varying)::text, ('loyalty_earned'::character varying)::text, ('loyalty_redeemed'::character varying)::text])))
);


--
-- Name: customer_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_activity_id_seq OWNED BY public.customer_activity.id;


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id integer NOT NULL,
    customer_id integer,
    region_id integer,
    city_id integer,
    area_name character varying(100) NOT NULL,
    landmark character varying(255),
    additional_instructions text,
    contact_phone character varying(30),
    is_default boolean DEFAULT false,
    google_maps_link text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_addresses_id_seq OWNED BY public.customer_addresses.id;


--
-- Name: customer_loyalty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_loyalty (
    id integer NOT NULL,
    customer_id integer,
    loyalty_points integer DEFAULT 0,
    loyalty_tier character varying(20) DEFAULT 'bronze'::character varying,
    total_spent numeric(10,2) DEFAULT 0,
    total_orders integer DEFAULT 0,
    average_order_value numeric(10,2) DEFAULT 0,
    last_purchase_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_loyalty_loyalty_tier_check CHECK (((loyalty_tier)::text = ANY (ARRAY[('bronze'::character varying)::text, ('silver'::character varying)::text, ('gold'::character varying)::text, ('platinum'::character varying)::text])))
);


--
-- Name: customer_loyalty_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_loyalty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_loyalty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_loyalty_id_seq OWNED BY public.customer_loyalty.id;


--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notes (
    id integer NOT NULL,
    customer_id integer,
    note text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_notes_id_seq OWNED BY public.customer_notes.id;


--
-- Name: customer_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_preferences (
    id integer NOT NULL,
    customer_id integer,
    sizes text[],
    colors text[],
    brands text[],
    categories text[],
    price_min numeric(10,2),
    price_max numeric(10,2),
    email_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    push_notifications boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_preferences_id_seq OWNED BY public.customer_preferences.id;


--
-- Name: customer_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_segments (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    criteria jsonb NOT NULL,
    customer_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_segments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_segments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_segments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_segments_id_seq OWNED BY public.customer_segments.id;


--
-- Name: customer_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_tags (
    id integer NOT NULL,
    customer_id integer,
    tag character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_tags_id_seq OWNED BY public.customer_tags.id;


--
-- Name: delivery_zone_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zone_areas (
    id integer NOT NULL,
    delivery_zone_id integer,
    region_id integer,
    city_id integer,
    area_name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: delivery_zone_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_zone_areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_zone_areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_zone_areas_id_seq OWNED BY public.delivery_zone_areas.id;


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    delivery_fee numeric(10,2) NOT NULL,
    estimated_days character varying(50) NOT NULL,
    coverage_areas text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT delivery_zones_delivery_fee_check CHECK ((delivery_fee >= (0)::numeric))
);


--
-- Name: delivery_zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_zones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_zones_id_seq OWNED BY public.delivery_zones.id;


--
-- Name: ghana_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ghana_cities (
    id integer NOT NULL,
    region_id integer,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ghana_cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ghana_cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ghana_cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ghana_cities_id_seq OWNED BY public.ghana_cities.id;


--
-- Name: ghana_regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ghana_regions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ghana_regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ghana_regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ghana_regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ghana_regions_id_seq OWNED BY public.ghana_regions.id;


--
-- Name: loyalty_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_programs (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    tiers jsonb NOT NULL,
    rewards jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loyalty_programs_type_check CHECK (((type)::text = ANY (ARRAY[('quarterly'::character varying)::text, ('annual'::character varying)::text, ('custom'::character varying)::text])))
);


--
-- Name: loyalty_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loyalty_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loyalty_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loyalty_programs_id_seq OWNED BY public.loyalty_programs.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    product_id integer,
    variant_id integer,
    product_name character varying(255) NOT NULL,
    product_description text,
    product_image_url character varying(500),
    variant_sku character varying(100),
    size character varying(20),
    color character varying(50),
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    requires_special_delivery boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_subtotal_check CHECK ((subtotal > (0)::numeric)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price > (0)::numeric))
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    order_number character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    payment_method character varying(20) NOT NULL,
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    payment_reference character varying(255),
    amount_paid numeric(10,2) DEFAULT 0,
    delivery_method character varying(20) NOT NULL,
    delivery_zone_id integer,
    pickup_location_id integer,
    delivery_address_id integer,
    delivery_address jsonb,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0 NOT NULL,
    shipping_fee numeric(10,2) DEFAULT 0 NOT NULL,
    large_order_fee numeric(10,2) DEFAULT 0 NOT NULL,
    special_delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    notes text,
    customer_notes text,
    estimated_delivery_date date,
    actual_delivery_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamp without time zone,
    shipped_at timestamp without time zone,
    delivered_at timestamp without time zone,
    CONSTRAINT orders_delivery_method_check CHECK (((delivery_method)::text = ANY (ARRAY[('delivery'::character varying)::text, ('pickup'::character varying)::text]))),
    CONSTRAINT orders_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('online'::character varying)::text, ('on_delivery'::character varying)::text, ('on_pickup'::character varying)::text]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('partial'::character varying)::text, ('paid'::character varying)::text, ('failed'::character varying)::text, ('refunded'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('processing'::character varying)::text, ('ready_for_pickup'::character varying)::text, ('shipped'::character varying)::text, ('out_for_delivery'::character varying)::text, ('delivered'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('refunded'::character varying)::text]))),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal > (0)::numeric)),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount > (0)::numeric))
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'GHS'::character varying NOT NULL,
    method character varying(50) DEFAULT 'paystack'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    provider character varying(50) DEFAULT 'paystack'::character varying NOT NULL,
    provider_reference character varying(255),
    paystack_reference character varying(255),
    transaction_id character varying(255),
    authorization_code character varying(255),
    customer_email character varying(255),
    metadata jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    order_id integer,
    payment_history jsonb DEFAULT '{"transactions": []}'::jsonb,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('partial'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('refunded'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: pickup_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_locations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    region_id integer,
    city_id integer,
    area_name character varying(100) NOT NULL,
    landmark character varying(255),
    additional_instructions text,
    contact_phone character varying(30),
    contact_email character varying(255),
    operating_hours jsonb,
    is_active boolean DEFAULT true,
    google_maps_link text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pickup_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pickup_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pickup_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pickup_locations_id_seq OWNED BY public.pickup_locations.id;


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id integer NOT NULL,
    product_id integer,
    sku character varying(100),
    size character varying(20),
    color character varying(50),
    stock_quantity integer DEFAULT 0,
    image_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_variants_stock_quantity_check CHECK ((stock_quantity >= 0))
);


--
-- Name: product_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variants_id_seq OWNED BY public.product_variants.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category character varying(100) NOT NULL,
    size character varying(20),
    color character varying(50),
    stock_quantity integer DEFAULT 0,
    image_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    requires_special_delivery boolean DEFAULT false,
    delivery_eligible boolean DEFAULT true,
    pickup_eligible boolean DEFAULT true,
    sku character varying(100),
    cost_price numeric(10,2),
    discount_price numeric(10,2),
    discount_percent numeric(5,2),
    brand_id integer,
    category_id integer,
    images text[],
    CONSTRAINT products_check CHECK (((discount_price > (0)::numeric) AND (discount_price < price))),
    CONSTRAINT products_cost_price_check CHECK ((cost_price >= (0)::numeric)),
    CONSTRAINT products_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT products_price_check CHECK ((price > (0)::numeric)),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_history (
    id integer NOT NULL,
    customer_id integer,
    order_id integer,
    order_date timestamp without time zone NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(20) NOT NULL,
    payment_method character varying(50),
    shipping_address jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_history_status_check CHECK (((status)::text = ANY (ARRAY[('completed'::character varying)::text, ('pending'::character varying)::text, ('cancelled'::character varying)::text, ('refunded'::character varying)::text])))
);


--
-- Name: purchase_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_history_id_seq OWNED BY public.purchase_history.id;


--
-- Name: purchase_history_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_history_items (
    id integer NOT NULL,
    purchase_id integer,
    product_id integer,
    product_name character varying(255) NOT NULL,
    size character varying(20),
    color character varying(50),
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    image_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_history_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_history_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_history_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_history_items_id_seq OWNED BY public.purchase_history_items.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'customer'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(30),
    department character varying(100),
    last_login timestamp without time zone,
    refresh_token character varying(500),
    refresh_token_expires_at timestamp without time zone,
    oauth_provider character varying(50),
    oauth_id character varying(255),
    oauth_email character varying(255),
    profile_picture_url character varying(500),
    reset_token character varying(500),
    reset_token_expires_at timestamp without time zone,
    CONSTRAINT check_auth_method CHECK (((password_hash IS NOT NULL) OR ((oauth_provider IS NOT NULL) AND (oauth_id IS NOT NULL)))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('customer'::character varying)::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: carts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts ALTER COLUMN id SET DEFAULT nextval('public.carts_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: checkout_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions ALTER COLUMN id SET DEFAULT nextval('public.checkout_sessions_id_seq'::regclass);


--
-- Name: communication_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_campaigns ALTER COLUMN id SET DEFAULT nextval('public.communication_campaigns_id_seq'::regclass);


--
-- Name: customer_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_activity ALTER COLUMN id SET DEFAULT nextval('public.customer_activity_id_seq'::regclass);


--
-- Name: customer_addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses ALTER COLUMN id SET DEFAULT nextval('public.customer_addresses_id_seq'::regclass);


--
-- Name: customer_loyalty id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_loyalty ALTER COLUMN id SET DEFAULT nextval('public.customer_loyalty_id_seq'::regclass);


--
-- Name: customer_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes ALTER COLUMN id SET DEFAULT nextval('public.customer_notes_id_seq'::regclass);


--
-- Name: customer_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences ALTER COLUMN id SET DEFAULT nextval('public.customer_preferences_id_seq'::regclass);


--
-- Name: customer_segments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments ALTER COLUMN id SET DEFAULT nextval('public.customer_segments_id_seq'::regclass);


--
-- Name: customer_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tags ALTER COLUMN id SET DEFAULT nextval('public.customer_tags_id_seq'::regclass);


--
-- Name: delivery_zone_areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zone_areas ALTER COLUMN id SET DEFAULT nextval('public.delivery_zone_areas_id_seq'::regclass);


--
-- Name: delivery_zones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones ALTER COLUMN id SET DEFAULT nextval('public.delivery_zones_id_seq'::regclass);


--
-- Name: ghana_cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_cities ALTER COLUMN id SET DEFAULT nextval('public.ghana_cities_id_seq'::regclass);


--
-- Name: ghana_regions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_regions ALTER COLUMN id SET DEFAULT nextval('public.ghana_regions_id_seq'::regclass);


--
-- Name: loyalty_programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_programs ALTER COLUMN id SET DEFAULT nextval('public.loyalty_programs_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: pickup_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_locations ALTER COLUMN id SET DEFAULT nextval('public.pickup_locations_id_seq'::regclass);


--
-- Name: product_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants ALTER COLUMN id SET DEFAULT nextval('public.product_variants_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchase_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history ALTER COLUMN id SET DEFAULT nextval('public.purchase_history_id_seq'::regclass);


--
-- Name: purchase_history_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_history_items_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_variant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_unique UNIQUE (cart_id, variant_id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: checkout_sessions checkout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: communication_campaigns communication_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_campaigns
    ADD CONSTRAINT communication_campaigns_pkey PRIMARY KEY (id);


--
-- Name: customer_activity customer_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_activity
    ADD CONSTRAINT customer_activity_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_loyalty customer_loyalty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_loyalty
    ADD CONSTRAINT customer_loyalty_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_preferences customer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);


--
-- Name: customer_segments customer_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_pkey PRIMARY KEY (id);


--
-- Name: customer_tags customer_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_pkey PRIMARY KEY (id);


--
-- Name: delivery_zone_areas delivery_zone_areas_delivery_zone_id_region_id_city_id_area_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zone_areas
    ADD CONSTRAINT delivery_zone_areas_delivery_zone_id_region_id_city_id_area_key UNIQUE (delivery_zone_id, region_id, city_id, area_name);


--
-- Name: delivery_zone_areas delivery_zone_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zone_areas
    ADD CONSTRAINT delivery_zone_areas_pkey PRIMARY KEY (id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: ghana_cities ghana_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_cities
    ADD CONSTRAINT ghana_cities_pkey PRIMARY KEY (id);


--
-- Name: ghana_cities ghana_cities_region_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_cities
    ADD CONSTRAINT ghana_cities_region_id_name_key UNIQUE (region_id, name);


--
-- Name: ghana_regions ghana_regions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_regions
    ADD CONSTRAINT ghana_regions_code_key UNIQUE (code);


--
-- Name: ghana_regions ghana_regions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_regions
    ADD CONSTRAINT ghana_regions_name_key UNIQUE (name);


--
-- Name: ghana_regions ghana_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_regions
    ADD CONSTRAINT ghana_regions_pkey PRIMARY KEY (id);


--
-- Name: loyalty_programs loyalty_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_programs
    ADD CONSTRAINT loyalty_programs_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pickup_locations pickup_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_locations
    ADD CONSTRAINT pickup_locations_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: purchase_history_items purchase_history_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history_items
    ADD CONSTRAINT purchase_history_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_history purchase_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history
    ADD CONSTRAINT purchase_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_bookings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_date ON public.bookings USING btree (date);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_brands_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_active ON public.brands USING btree (is_active);


--
-- Name: idx_brands_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brands_name ON public.brands USING btree (name);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_cart_items_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_variant_id ON public.cart_items USING btree (variant_id);


--
-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_sort_order ON public.categories USING btree (sort_order);


--
-- Name: idx_checkout_sessions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkout_sessions_reference ON public.checkout_sessions USING btree (payment_reference);


--
-- Name: idx_checkout_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkout_sessions_user ON public.checkout_sessions USING btree (user_id);


--
-- Name: idx_communication_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_campaigns_status ON public.communication_campaigns USING btree (status);


--
-- Name: idx_customer_activity_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_activity_customer_id ON public.customer_activity USING btree (customer_id);


--
-- Name: idx_customer_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_activity_type ON public.customer_activity USING btree (type);


--
-- Name: idx_customer_addresses_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses USING btree (customer_id);


--
-- Name: idx_customer_addresses_region_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_region_city ON public.customer_addresses USING btree (region_id, city_id);


--
-- Name: idx_customer_loyalty_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_loyalty_customer_id ON public.customer_loyalty USING btree (customer_id);


--
-- Name: idx_customer_preferences_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_preferences_customer_id ON public.customer_preferences USING btree (customer_id);


--
-- Name: idx_customer_segments_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_segments_name ON public.customer_segments USING btree (name);


--
-- Name: idx_customer_tags_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tags_customer_id ON public.customer_tags USING btree (customer_id);


--
-- Name: idx_delivery_zone_areas_region_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zone_areas_region_city ON public.delivery_zone_areas USING btree (region_id, city_id);


--
-- Name: idx_delivery_zone_areas_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zone_areas_zone_id ON public.delivery_zone_areas USING btree (delivery_zone_id);


--
-- Name: idx_delivery_zones_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zones_active ON public.delivery_zones USING btree (is_active);


--
-- Name: idx_delivery_zones_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zones_name ON public.delivery_zones USING btree (name);


--
-- Name: idx_ghana_cities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ghana_cities_active ON public.ghana_cities USING btree (is_active);


--
-- Name: idx_ghana_cities_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ghana_cities_region_id ON public.ghana_cities USING btree (region_id);


--
-- Name: idx_ghana_regions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ghana_regions_active ON public.ghana_regions USING btree (is_active);


--
-- Name: idx_loyalty_programs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_programs_active ON public.loyalty_programs USING btree (is_active);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_delivery_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivery_method ON public.orders USING btree (delivery_method);


--
-- Name: idx_orders_delivery_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivery_zone ON public.orders USING btree (delivery_zone_id);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_method ON public.orders USING btree (payment_method);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_pickup_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_pickup_location ON public.orders USING btree (pickup_location_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_payments_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking_id ON public.payments USING btree (booking_id);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_pickup_locations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pickup_locations_active ON public.pickup_locations USING btree (is_active);


--
-- Name: idx_pickup_locations_region_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pickup_locations_region_city ON public.pickup_locations USING btree (region_id, city_id);


--
-- Name: idx_product_variants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_active ON public.product_variants USING btree (is_active);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_product_variants_size_color; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_size_color ON public.product_variants USING btree (size, color);


--
-- Name: idx_product_variants_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_sku ON public.product_variants USING btree (sku);


--
-- Name: idx_products_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_brand_id ON public.products USING btree (brand_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_purchase_history_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_history_customer_id ON public.purchase_history USING btree (customer_id);


--
-- Name: idx_purchase_history_items_purchase_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_history_items_purchase_id ON public.purchase_history_items USING btree (purchase_id);


--
-- Name: idx_purchase_history_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_history_order_date ON public.purchase_history USING btree (order_date);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: carts carts_delivery_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_delivery_zone_id_fkey FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: checkout_sessions checkout_sessions_delivery_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_delivery_zone_id_fkey FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;


--
-- Name: checkout_sessions checkout_sessions_pickup_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_pickup_location_id_fkey FOREIGN KEY (pickup_location_id) REFERENCES public.pickup_locations(id) ON DELETE SET NULL;


--
-- Name: checkout_sessions checkout_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customer_activity customer_activity_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_activity
    ADD CONSTRAINT customer_activity_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.ghana_cities(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.ghana_regions(id) ON DELETE CASCADE;


--
-- Name: customer_loyalty customer_loyalty_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_loyalty
    ADD CONSTRAINT customer_loyalty_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customer_notes customer_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_notes customer_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customer_preferences customer_preferences_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customer_tags customer_tags_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: delivery_zone_areas delivery_zone_areas_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zone_areas
    ADD CONSTRAINT delivery_zone_areas_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.ghana_cities(id) ON DELETE CASCADE;


--
-- Name: delivery_zone_areas delivery_zone_areas_delivery_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zone_areas
    ADD CONSTRAINT delivery_zone_areas_delivery_zone_id_fkey FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON DELETE CASCADE;


--
-- Name: delivery_zone_areas delivery_zone_areas_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zone_areas
    ADD CONSTRAINT delivery_zone_areas_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.ghana_regions(id) ON DELETE CASCADE;


--
-- Name: ghana_cities ghana_cities_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ghana_cities
    ADD CONSTRAINT ghana_cities_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.ghana_regions(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: orders orders_delivery_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_zone_id_fkey FOREIGN KEY (delivery_zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;


--
-- Name: orders orders_pickup_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pickup_location_id_fkey FOREIGN KEY (pickup_location_id) REFERENCES public.pickup_locations(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: pickup_locations pickup_locations_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_locations
    ADD CONSTRAINT pickup_locations_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.ghana_cities(id) ON DELETE CASCADE;


--
-- Name: pickup_locations pickup_locations_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_locations
    ADD CONSTRAINT pickup_locations_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.ghana_regions(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: purchase_history purchase_history_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history
    ADD CONSTRAINT purchase_history_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchase_history_items purchase_history_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history_items
    ADD CONSTRAINT purchase_history_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: purchase_history_items purchase_history_items_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_history_items
    ADD CONSTRAINT purchase_history_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchase_history(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aktYQnUys1oywaPM8cBNbYYqyaIK2UFJdHrBws3UT3VmNvY8zF4Y73IIBgbGT0A

