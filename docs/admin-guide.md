# Southeastern Electrical — Admin User Guide

This guide explains how to use the admin area of the Southeastern Electrical
website. The admin area is where you see who has booked a callback, control
when customers are allowed to book, and choose who gets notified by email.

You don't need any technical knowledge to use it. Everything is done through
normal web pages in your browser, on a computer, tablet, or phone.

---

## Contents

1. [How booking works (the big picture)](#1-how-booking-works-the-big-picture)
2. [Signing in and out](#2-signing-in-and-out)
3. [Finding your way around](#3-finding-your-way-around)
4. [Bookings page](#4-bookings-page)
5. [Availability page](#5-availability-page)
6. [Settings page](#6-settings-page)
7. [Booking notification emails](#7-booking-notification-emails)
8. [Step-by-step: common tasks](#8-step-by-step-common-tasks)
9. [Good to know](#9-good-to-know)
10. [Troubleshooting](#10-troubleshooting)
11. [When to contact your developer](#11-when-to-contact-your-developer)
12. [Quick reference](#12-quick-reference)

---

## 1. How booking works (the big picture)

Customers visit the **Book a callback** page on the website, pick a day and a
time, and leave their **name** and **phone number**. They can also leave an
**email address** if they'd like a calendar invite for the call. That's
optional. Customers don't create accounts.

When someone books:

- The time slot is reserved for them and disappears from the public calendar,
  so nobody else can book the same time.
- An email is sent to the business address(es) you've chosen in
  [Settings](#6-settings-page).
- If the customer left an email address, they get a confirmation email with a
  calendar invite attached (see
  [Emails customers receive](#emails-customers-receive)).
- The booking shows up on your [Bookings page](#4-bookings-page).
- **You** call the customer at the booked time. The website doesn't place the
  call.

Which times customers can pick depends on three things you control:

| What you control                  | Where                                                 | Example                                  |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Your normal weekly hours          | [Availability → Weekly hours](#51-weekly-hours)       | Monday–Friday, 9:00 AM – 5:00 PM         |
| Exceptions for a specific date    | [Availability → Date override](#52-date-overrides)    | Closed on July 4th, or no 2:00 PM on 3rd |
| How long each callback slot lasts | [Settings → Slot duration](#62-slot-duration-minutes) | 30 minutes                               |

The website combines these to build the list of times customers see, and
automatically hides anything already booked or already in the past.

---

## 2. Signing in and out

### Signing in

1. Go to the admin sign-in page:
   **https://southeasternelectrical.org/admin/login**
2. Enter the **email** and **password** your developer set up for you.
3. Click **Sign in**.

You'll land on the **Bookings** page.

Tip: bookmark the sign-in page. If you try to open any admin page while signed
out, the site sends you to the sign-in page first and then takes you back to
where you were going.

### How long you stay signed in

You stay signed in on that device for **5 days**. After that, you'll be asked
to sign in again. This is normal.

### Signing out

Click **Sign out** in the top-right corner (on a phone, open the menu first;
see below). Always sign out if you've used a shared or public computer.

### Forgotten password or new staff member

There's no "forgot password" button, and you can't add users from the admin
area. Contact your developer to:

- Reset your password
- Give another person their own admin sign-in
- Remove someone's access

Please don't share one login between several people. Ask for separate logins
instead, so access can be removed for one person without affecting anyone
else.

---

## 3. Finding your way around

Every admin page has a dark blue bar across the top with:

- **Admin** (left): takes you back to the Bookings page.
- **Bookings**, **Availability**, **Settings**: the three admin pages.
- **Guide**: this guide. You can open it any time.
- **Your email address**: shows which account you're signed in as.
- **Sign out**.

**On a phone or small tablet**, those links are hidden behind a **menu button**
(three horizontal lines) in the top-right corner. Tap it to open the menu, and
tap it again (or press outside the menu) to close it.

On a long page, once you've scrolled down a way, an **arrow button** appears in
the bottom-right corner. Click it to jump back to the top.

### Getting help while you work

- Each admin page has a **help link** under its title (for example "How
  bookings work"). It opens this guide at the section for that page.
- In the guide, use **On this page** to jump to any section. It's on the left
  on a computer, and at the top on a phone.
- To keep a copy, click **Print or save as PDF** at the top of the guide.

---

## 4. Bookings page

This is your list of callbacks. It's the first page you see after signing in.

It has two sections.

### Upcoming

Every confirmed callback that hasn't happened yet, soonest first. Each entry
shows:

- The customer's **name**
- The **day and time** of the callback, e.g. `Tue, Oct 6 · 10:30 AM ET`
- Their **phone number**, e.g. `(555) 123-4567`
- Their **email address**, if they left one
- A **Cancel** button

### Recent / cancelled

Callbacks from **the last 7 days** that have already passed, plus any bookings
that were cancelled. Each entry is marked as either `confirmed` (the callback
time has passed) or `cancelled`. Anything older than 7 days drops off this list
automatically.

### Searching bookings

Type in the **Search bookings** box at the top of the page to show only the
bookings that match. You can search by the customer's **name**, **phone
number** (with or without dashes, e.g. `555-123` or `555123`), **email**,
**date** (e.g. `Oct 6` or `Tuesday`), or **status** (`cancelled`). Several
words narrow it down further, e.g. `smith oct`.

Both sections filter as you type. To see everything again, click **Clear
search** or press **Esc**. The search only looks at the bookings already on the
page, so refresh first if you're expecting a new one.

### About the times shown

Times on the Bookings page are shown in the **timezone of the device you're
using**, with a short label like `ET` (Eastern) or `CT` (Central) at the end.
If you're travelling in a different timezone, the times shift to your local
time. The label always tells you which timezone you're looking at.

### Cancelling a booking

1. Find the booking under **Upcoming** and click **Cancel**.
2. Review the inline confirmation panel. **Email the customer asking them to reschedule** is checked when an email is on file. Add an optional message (up to 500 characters), or untick the checkbox if you will contact them yourself.
3. Click **Cancel booking**, or **Keep booking** to go back.

The booking moves to **Recent / cancelled**. Its time becomes available again if it is still within your availability, notice period, and booking window.

For future bookings, the email includes the original time in the customer's timezone, your message, a **Pick a new time** link, and a calendar cancellation using the original invite identifier. Their calendar app may ask them to accept the cancellation. For older bookings without an invite identifier, the email asks them to remove the old event themselves.

Always read the result. **Email failed**, **Not emailed**, or **No email on file** means you should call the customer at the number shown. An email failure never reverses the cancellation. Recent / cancelled also shows the saved notification status. If the notification result is pending or unavailable, check before assuming the customer was emailed.

**Cancelling can't be undone.** Re-book the customer if you cancel by mistake. Customers cannot cancel themselves, and the website does not send SMS.

### Seeing new bookings

The page doesn't update by itself. To check for new bookings, refresh the page
in your browser. You'll also get an [email](#7-booking-notification-emails) for
every new booking.

---

## 5. Availability page

This page controls **when customers are allowed to book**. It has three
sections: **Weekly hours**, **Date override**, and **Current overrides**.

A confirmation message (for example "Weekly hours saved.") appears at the top
of the page after each successful change. If something is wrong, a
red message explains what to fix.

### 5.1 Weekly hours

This is your normal, repeating schedule. It applies to every week unless you
set an override for a particular date.

At the top of the section you'll see a line like
**"Times are local to Eastern Time (ET)."** All the hours you enter here are in
that timezone, which is set on the [Settings page](#61-business-timezone).

There's one row per day, Sunday to Saturday. Each row has:

- A **checkbox** next to the day name. Ticked means you take callbacks that
  day; unticked means that day is off.
- A **from** time and an **until** time (the two time boxes).

To change your weekly hours:

1. Tick or untick the days you want.
2. For each ticked day, set the start and end times.
3. Click **Save weekly hours**.

How the times turn into bookable slots:

- Slots start at your start time and repeat every _slot duration_ (set in
  Settings). With 9:00 AM – 5:00 PM and 30-minute slots, customers can pick
  9:00, 9:30, 10:00 … up to **4:30 PM**.
- A slot is only offered if it **finishes** by your end time. With a 5:00 PM
  end time and 30-minute slots, 4:30 PM is the last slot, because a 5:00 PM
  slot would run past closing.
- The end time must be later than the start time, or you'll get an error.

Limits:

- **One block of time per day.** You can't enter a split day like
  "9–12 and 1–5" here. To keep a lunch hour free, block those slots on
  specific dates using a [date override](#52-date-overrides).
- **Review affected bookings before saving.** Shortening hours or disabling a weekday shows a warning listing affected callbacks. Choose **Save anyway** to keep them, or **Go back**. Use **View bookings** to cancel individual callbacks and notify customers. Upcoming callbacks outside saved availability have an **Outside your hours** badge.

### 5.2 Date overrides

An override is a **one-off exception for a single date**. It doesn't change
your weekly hours. Use it for holidays, days off, appointments, or blocking a
few specific times.

There are two kinds.

#### Close a whole day

1. Under **Date override**, pick the **Date**.
2. Leave **Closed all day** ticked (it's ticked by default).
3. Click **Save override**.

That date disappears from the public booking calendar.

#### Block specific times on a day

1. Pick the **Date**.
2. **Untick "Closed all day"**. The **Blocked slots** box can only be typed in
   once it's unticked.
3. In **Blocked slots**, type the **start times** of the slots you want to
   block, separated by spaces or commas.
4. Click **Save override**.

Blocked times follow a few rules:

- **Use 24-hour time with a colon and two digits for the hour.**
  For example, `09:00` for 9 AM, `13:30` for 1:30 PM, and `16:00` for 4 PM.
  `9:00` or `2pm` won't be accepted.
- **Only type start times that are actually on your schedule.** With 30-minute
  slots starting at 9:00, the valid times are `09:00`, `09:30`, `10:00`, and so
  on. If you type `09:15`, saving is rejected and the message lists valid start times.
- To block a full hour with 30-minute slots, block **both** halves, e.g.
  `12:00 12:30`.

Example: to keep lunch free on 30-minute slots, type `12:00, 12:30`.

24-hour time conversion:

| 12-hour  | 24-hour | 12-hour | 24-hour |
| -------- | ------- | ------- | ------- |
| 8:00 AM  | `08:00` | 1:00 PM | `13:00` |
| 9:00 AM  | `09:00` | 2:00 PM | `14:00` |
| 10:00 AM | `10:00` | 3:00 PM | `15:00` |
| 11:00 AM | `11:00` | 4:00 PM | `16:00` |
| 12:00 PM | `12:00` | 5:00 PM | `17:00` |

#### Things to know about overrides

- **One override per date.** Saving an override for a date that already has
  one **replaces** it. If you want to block more times on that day, enter the
  full list, including the times you blocked before.
- **Review affected bookings before saving.** If closing a date or blocking slots affects existing callbacks, a panel lists them. Choose **Cancel them & email customers**, **Cancel them without emailing**, or **Keep the bookings**. You can add an optional message to the emails. The saved summary shows each cancellation and notification result; call anyone who was not emailed. Bookings arriving before the change is saved are checked again on the server.
- **Overrides can only close or block time**. They can't add extra hours. To
  open on a normally closed day, contact your developer.
- Saving an override with "Closed all day" unticked and no blocked times has no
  effect.

### 5.3 Current overrides

This is a list of every override you've saved, in date order. Each entry shows
the date (written as `YYYY-MM-DD`, e.g. `2026-12-25`) and either **Closed** or
**Blocked:** followed by the blocked times.

To remove an override and put that date back to your normal weekly hours:

1. Click **Remove** next to it.
2. Confirm in the pop-up.

Past overrides stay in the list until you remove them. They don't do any harm,
but it's worth clearing old ones out every so often to keep the list short.

---

## 6. Settings page

Settings control how the booking system works overall. Change what you need,
then click **Save settings** at the bottom. You'll see "Settings saved." when
it's done.

### 6.1 Business timezone

The timezone your business works in. Choose from Eastern, Central, Mountain,
Arizona, or Pacific Time.

This timezone is used for:

- Your **weekly hours** and **date overrides**. "9:00 AM" means 9:00 AM in this
  timezone.
- The time shown in **notification emails**.

Customers in other timezones see times converted to their own local time
automatically, so you don't need to do anything for them.

You'll normally set this once and leave it. Changing it shifts **all your
hours** to the new timezone. For example, 9:00 AM Eastern becomes 9:00 AM
Central, which is an hour later in real time.

Changing timezone keeps existing bookings at their original real time. The website prevents new appointments overlapping them. Before saving, a preview lists callbacks outside the proposed availability. Choose **Save anyway** to keep them, or **Go back**. Review affected callbacks on **Bookings**, where you can cancel and email each customer.

### 6.2 Slot duration (minutes)

How long each callback slot is. It must be a whole number between **15 and 120 minutes**. The default is 30.

A shorter duration offers more, shorter times per day. A longer duration offers fewer, longer times. Existing bookings keep their original length, and any time overlapping them remains unavailable to new customers. When upcoming bookings exist, the form reminds you that they keep their length. A preview warns about callbacks outside the proposed availability before saving.

Review **blocked slots** in date overrides after changing the grid. Blocked start times must match a real slot when saving an override.

### 6.3 Notify emails

The email address(es) that receive a message whenever a customer books.

- Put **one email address per line** (commas also work).
- You can list as many addresses as you like, e.g. the owner and the office.
- **At least one address is required** when saving Settings.
- Before the first address is saved, the form shows a masked bootstrap address if one is configured. Once you save an address, only your Settings list receives business notifications; no hidden copy is added.
- If an address is mistyped (for example, missing the `@`), you'll get an
  error asking for valid addresses, and nothing is saved until it's fixed.

### 6.4 Minimum booking notice

Choose **No minimum**, **30 minutes**, **1 hour**, **2 hours**, **4 hours**, or **Next day / 24 hours**. Only times more than that far ahead are offered and accepted. Existing bookings are kept. The initial default is **No minimum**, preserving the original behaviour until you choose.

### 6.5 How far ahead customers can book

Use **1 week**, **2 weeks**, **1 month (30 days)**, **2 months (60 days)**, or **3 months (90 days)**, or enter a custom value from **1 to 90 days**. The help text shows the last included date in the business timezone.

The count includes today and closed days: 14 means today plus the next 13 calendar days. Extending the window makes new dates available without a redeploy. Add holiday and vacation overrides across the entire window. Shrinking it stops new bookings beyond the last date; existing bookings there are kept.

For windows over 21 days, the public calendar shows one week at a time with **Previous week** and **Next week** controls.

---

## 7. Booking notification emails

When a customer books, everyone on your **Notify emails** list is sent an
email.

- **From:** Southeastern Electrical Services
- **Subject:** `New callback booking: Jane Doe · Tuesday, Oct 6 · 10:30 AM ET`
- **Contents:** the customer's name, phone number, email address (if they left
  one), date and time (in your business timezone), and a booking ID.

### Emails can't be guaranteed: use the Bookings page as your list

A booking is always saved, even if its email doesn't go out. If the email
service has a problem or isn't set up correctly, **the booking still succeeds,
but no email is sent and you won't see a warning.** So:

- **Treat the Bookings page as the official list,** not your inbox. Check it at
  least once a day, and before you plan your calls.
- **Check emails are arriving before you rely on them** (see below), and again
  whenever you change the Notify emails list.

### Check emails are arriving (do this when you first start)

1. In **Settings**, enter your own **Notify emails** address(es) and save. This switches business notifications to the addresses you control.
2. Go to the public **Book a callback** page and book a slot using your own name, phone number, and email address.
3. Confirm that:
   - the booking appears on the **Bookings** page
   - every address on your Notify emails list receives the notification
     (check spam or junk too)
   - your own email address receives the confirmation and calendar invite
4. **Cancel** the test booking with **Email the customer** checked. Confirm you receive a cancellation email, the **Pick a new time** link works, and the calendar cancellation removes or marks the event cancelled (accept it if your calendar asks).

If any email doesn't arrive after 10 minutes (including spam), contact your
developer.

### Tips

- **Check your spam or junk folder** the first time, and mark the email as
  "Not spam" so future ones land in your inbox.
- Customers can be emailed when future bookings are cancelled. Business notification recipients are controlled entirely by Settings after your first address is saved.
- For customers without email, call them yourself. Cancellation results make this clear.

### Emails customers receive

Customers who leave an email address when booking are sent a confirmation
email:

- **Subject:** `Your callback is booked · Tuesday, Oct 6 · 10:30 AM ET`
  (shown in the customer's own timezone)
- **Contents:** the date and time, and the phone number you'll call.
- **Attachment:** a calendar invite (`invite.ics`). Opening it adds the call to
  their calendar with a 15-minute reminder.

After booking, the confirmation screen tells the customer whether the invite
was sent. If it couldn't be sent, the booking is still confirmed.

When you cancel a future callback with notification enabled, the customer receives the original time, your optional message, a reschedule link, and a calendar cancellation when the original invite identifier is available. Replies go to the first Notify emails address. An optional business phone appears if configured by your developer. If sending fails, the booking is still cancelled and you should call the customer.

---

## 8. Step-by-step: common tasks

### Take a day off or close for a holiday

1. **Availability** → **Date override**.
2. Pick the date, leave **Closed all day** ticked, and click **Save override**.
3. If a conflict panel appears, choose whether to cancel and email the affected customers, cancel without emailing, or keep their callbacks. Read the result and call anyone who wasn't emailed.

### Block off an hour for an appointment

1. **Availability** → **Date override**.
2. Pick the date and **untick Closed all day**.
3. Type the slot start times in 24-hour format, e.g. `14:00 14:30` for 2–3 PM
   with 30-minute slots.
4. Click **Save override**.

### Change your regular hours

1. **Availability** → **Weekly hours**.
2. Adjust the times, or tick/untick days.
3. Click **Save weekly hours**.
4. Review any conflict warning before saving. If you choose **Save anyway**, use **Bookings** to contact or cancel the affected callbacks.

### Stop taking bookings for a while (e.g. a vacation)

Add a **Closed all day** override for each date you'll be away. Check **Settings → How far ahead customers can book** and cover the full booking window, especially after extending it. Use each override's conflict panel to cancel and notify affected callbacks, and call customers who cannot be emailed.

### Booking on behalf of a customer

If a customer calls or emails asking for a callback, you can book it for them:

1. Go to the public **Book a callback** page on the website (the same page
   customers use).
2. Pick the day and time, and enter the customer's name and phone number.
3. For email, enter the **customer's** email address if they'd like a calendar
   invite, or leave it blank. Don't enter your own; the invite would go to you.
4. Submit.

The booking shows up on your Bookings page and sends the usual notification
email, just like any other booking.

### Reschedule a booking

There's no "edit" or "move" button. Instead:

1. Book the new time on the public **Book a callback** page with the customer's
   name and phone number (see above).
2. Then **Cancel** their old booking on the Bookings page.

Doing it in this order means the old slot isn't freed up until the new one is
secured.

If the customer has an email address on file, they'll get a new calendar
invite for the new time. Cancelling the old callback with **Email the customer** checked sends the calendar cancellation for the old invite. You may want to explain in the optional message that the new time is already booked; the standard email also includes a link to choose a new time.

### Add or change who gets booking emails

1. **Settings** → **Notify emails**.
2. Add, remove, or edit addresses (one per line).
3. Click **Save settings**.
4. Make a test booking to confirm the new addresses receive the email (see
   [Check emails are arriving](#check-emails-are-arriving-do-this-when-you-first-start)),
   then cancel it from the Bookings page.

---

## 9. Good to know

- **You control the booking window.** The default is 14 calendar days including today, adjustable from 1 to 90 in Settings.
- **You control minimum notice.** Choose how far in advance a callback must be booked. The server enforces it even for a customer with an old page open.

- **Customers can't cancel or change bookings themselves.** They'll need to
  contact you, and you can cancel from the Bookings page.
- **Double-booking is prevented automatically.** If two customers try to grab
  the same slot at the same moment, only one succeeds. The other is asked to
  pick another time.
- **Past times are hidden automatically.** Customers never see slots that have
  already started.
- **Changes take effect right away.** As soon as you save hours, overrides, or
  settings, the public booking page uses them. A customer who already has the
  page open with a day selected keeps seeing that day's old times until they
  click a day or reload the page. If they try to book a time you've just
  closed, they're told it's no longer available and asked to pick another.
- **The admin area is private.** It's hidden from search engines, and every
  page requires sign-in.

---

## 10. Troubleshooting

| What you see                                                    | What it means / what to do                                                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Invalid email or password."                                    | Check for typos, and that Caps Lock is off. If it keeps happening, contact your developer for a password reset.                                                       |
| You're suddenly sent back to the sign-in page                   | Your 5-day sign-in period ended. Just sign in again.                                                                                                                  |
| "Each day's end time must be after start."                      | On Weekly hours, one of the ticked days has an end time that's the same as or earlier than its start time. Fix it and save again.                                     |
| "Blocked slots must use HH:mm times."                           | A blocked time isn't in 24-hour format. Use two digits for the hour, e.g. `09:00`, not `9:00` or `9am`.                                                               |
| "… isn’t a slot start time …"                                   | Choose one of the valid start times listed in the error. Review overrides after changing slot duration.                                                               |
| "Slot duration must be between 15 and 120 minutes."             | Pick a value from 15 to 120.                                                                                                                                          |
| "Enter valid notification email addresses."                     | One of the Notify emails is mistyped. Fix the address shown in the message.                                                                                           |
| A day shows "No open times on this day" for customers           | That day is fully booked, or all remaining times have already passed today. (Unticked days and days closed by an override don't appear at all.)                       |
| Not receiving booking emails                                    | Check spam/junk, then check the addresses on the Settings page. The booking will still be on the Bookings page. If emails still don't arrive, contact your developer. |
| "Email failed" after cancelling                                 | The callback is cancelled. Call the customer; do not assume they received the cancellation or calendar update.                                                        |
| A new booking isn't on the Bookings page                        | Refresh the page.                                                                                                                                                     |
| "Booking is temporarily unavailable" or "Something went wrong." | Try again in a minute. If it keeps happening, contact your developer; something may need attention behind the scenes.                                                 |

---

## 11. When to contact your developer

Get in touch for anything you can't do from the admin pages, including:

- Password resets, adding or removing admin users
- Opening on a day that's normally closed
- Split hours on a regular basis (e.g. a daily lunch break)
- Changes to email wording, sender name, reschedule site URL, or optional business phone
- Changes to the website's text, services list, photos, or pages
- Any error message that keeps coming back
- Anything that doesn't seem to be working the way this guide describes

When reporting a problem, it helps to include:

- Which page you were on
- What you clicked or entered
- The exact message you saw (a screenshot is ideal)
- The date and time it happened

---

## 12. Quick reference

| I want to…                        | Go to                                | Do this                                                  |
| --------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| See upcoming callbacks            | **Bookings**                         | Look under **Upcoming**                                  |
| Cancel a callback                 | **Bookings**                         | **Cancel** → confirm → call the customer                 |
| Change my normal hours            | **Availability** → Weekly hours      | Edit days/times → **Save weekly hours**                  |
| Close a single day                | **Availability** → Date override     | Pick date, keep **Closed all day** → **Save override**   |
| Block certain times on a day      | **Availability** → Date override     | Pick date, untick Closed, type times → **Save override** |
| Undo an override                  | **Availability** → Current overrides | **Remove** → confirm                                     |
| Change who gets booking emails    | **Settings**                         | Edit **Notify emails** → **Save settings**               |
| Change slot length                | **Settings**                         | Edit **Slot duration** → **Save settings**               |
| Change the business timezone      | **Settings**                         | Choose **Business timezone** → **Save settings**         |
| Book or reschedule for a customer | Public **Book a callback** page      | Book as the customer would; cancel the old one if moving |
| Sign out                          | Top-right of any admin page          | **Sign out** (on phones, open the menu first)            |
