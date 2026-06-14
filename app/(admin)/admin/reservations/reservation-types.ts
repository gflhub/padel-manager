export interface Reservation {
    id: string
    date: string
    start_time: string
    end_time: string
    duration: number
    price_per_hour: number
    total_price: number
    status: string
    players: { name: string }[]
    court: { id: string; name: string; court_type: string } | null
}

export interface Court {
    id: string
    name: string
}
